import datetime
import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from suimei.meishiki import Meishi
from suimei.model.Gouka import Gouka
from suimei.model.bunseki import Bunseki
from suimei.model.meishiki import Meishiki as MeishikiRecord
from suimei.service.deepseek import DeepseekError
from suimei.service.prompt_builder import (
    build_chat_prompt_from_meishiki,
    build_prompt_from_meishiki,
    format_element_flow_reference,
    format_gouka_reference,
    format_shin_type_reference,
)


TEST_BIRTHDATE = datetime.datetime(1997, 2, 14, 2, 25)
TEST_ENERGY = {
    "木": 120.0,
    "火": 80.0,
    "土": 60.0,
    "金": 40.0,
    "水": 100.0,
}


class ShinTypeRatioTests(TestCase):
    def build_meishi_with_ratio(self, same_ratio, different_ratio):
        ratio = {
            "same_ratio": same_ratio,
            "different_ratio": different_ratio,
            "delta": same_ratio - different_ratio,
            "basis": "element_energy",
        }
        with patch("builtins.print"), patch.object(
            Meishi, "_build_five_element_energy", return_value=TEST_ENERGY
        ), patch.object(Meishi, "_build_shin_type_ratio", return_value=ratio):
            return Meishi(TEST_BIRTHDATE, 1)

    def test_shin_type_is_wang_when_same_ratio_above_55_percent(self):
        meishi = self.build_meishi_with_ratio(0.60, 0.40)

        self.assertEqual(meishi.shin_type, "身旺")
        self.assertAlmostEqual(meishi.shin_type_ratio["same_ratio"], 0.60)

    def test_shin_type_is_weak_when_same_ratio_below_45_percent(self):
        meishi = self.build_meishi_with_ratio(0.40, 0.60)

        self.assertEqual(meishi.shin_type, "身弱")
        self.assertAlmostEqual(meishi.shin_type_ratio["different_ratio"], 0.60)

    def test_shin_type_is_balanced_inside_center_band(self):
        meishi = self.build_meishi_with_ratio(0.50, 0.50)

        self.assertEqual(meishi.shin_type, "中和")
        self.assertAlmostEqual(meishi.shin_type_ratio["delta"], 0.0)

    def test_relation_mapping_uses_aggregated_yin_group(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)
        relations = meishi.element_energy["relation"]

        self.assertIn("印綬", relations.values())
        self.assertNotIn("正印", relations.values())
        same_group = {element for element, relation in relations.items() if relation in {"比劫", "印綬"}}
        self.assertTrue(same_group)


class GoukaAdjustedEnergyTests(TestCase):
    def build_stub_meishi(self, month):
        meishi = Meishi.__new__(Meishi)
        meishi.chishi = ["子", month, "卯", "酉"]
        meishi.tsukirei = month
        return meishi

    def build_transform_gouka(self, target="金"):
        return {
            "resolved": {
                "kan": [],
                "shi": [],
                "effective_kan": [
                    {
                        "type": "干化",
                        "state": "化成",
                        "to": target,
                        "element": ["乙", "庚"],
                        "score": 100,
                        "source_type": "干合",
                    }
                ],
                "effective_shi": [],
            }
        }

    def test_transformation_gain_is_stronger_when_target_element_is_in_season(self):
        base_energy = {"木": 100.0, "火": 0.0, "土": 0.0, "金": 0.0, "水": 0.0}

        in_season = self.build_stub_meishi("酉")._build_gouka_adjusted_element_energy(
            base_energy=base_energy,
            gouka=self.build_transform_gouka("金"),
        )
        out_of_season = self.build_stub_meishi("卯")._build_gouka_adjusted_element_energy(
            base_energy=base_energy,
            gouka=self.build_transform_gouka("金"),
        )

        self.assertGreater(in_season["energy"]["金"], out_of_season["energy"]["金"])
        in_season_huanyuu = next(item for item in in_season["adjustments"] if item["action"] == "化入")
        out_of_season_huanyuu = next(item for item in out_of_season["adjustments"] if item["action"] == "化入")
        self.assertGreater(in_season_huanyuu["season_factor"], out_of_season_huanyuu["season_factor"])
        self.assertEqual(in_season_huanyuu["season_month"], "酉")
        self.assertEqual(in_season_huanyuu["season_target"], "金")

    def test_empty_gouka_adjustment_does_not_apply_month_coefficient_again(self):
        base_energy = {"木": 120.0, "火": 80.0, "土": 60.0, "金": 40.0, "水": 100.0}

        payload = self.build_stub_meishi("卯")._build_gouka_adjusted_element_energy(
            base_energy=base_energy,
            gouka={"resolved": {}},
        )

        self.assertEqual(payload["energy"], base_energy)
        self.assertEqual(payload["basis"], "gouka_resolved")
        self.assertEqual(payload["basis_detail"], "gouka_resolved_tsukirei_tempered")

    def test_sanhe_transformation_contributes_to_adjusted_energy(self):
        base_energy = {"木": 0.0, "火": 0.0, "土": 100.0, "金": 100.0, "水": 0.0}
        gouka = {
            "resolved": {
                "kan": [],
                "shi": [
                    {
                        "realm": "shi",
                        "type": "三合局",
                        "kind": "合",
                        "state": "成立",
                        "to": "水",
                        "element": ["申", "子", "辰"],
                        "score": 100,
                    }
                ],
                "effective_kan": [],
                "effective_shi": [
                    {
                        "type": "支化",
                        "source_type": "三合局",
                        "state": "化成",
                        "to": "水",
                        "element": ["申", "子", "辰"],
                        "score": 100,
                    }
                ],
            }
        }

        payload = self.build_stub_meishi("子")._build_gouka_adjusted_element_energy(
            base_energy=base_energy,
            gouka=gouka,
        )

        self.assertGreater(payload["energy"]["水"], base_energy["水"])
        self.assertTrue(
            any(
                item["source_type"] == "三合局" and item["action"] == "化入"
                for item in payload["adjustments"]
            )
        )


class SuimeiViewResponseTests(TestCase):
    def test_query_response_contains_ratio_payload(self):
        ratio = {
            "same_ratio": 0.60,
            "different_ratio": 0.40,
            "delta": 0.20,
            "basis": "element_energy",
        }
        with patch("builtins.print"), patch.object(
            Meishi, "_build_five_element_energy", return_value=TEST_ENERGY
        ), patch.object(Meishi, "_build_shin_type_ratio", return_value=ratio):
            response = self.client.post(
                "/api/query",
                {
                    "date": "1997-02-14",
                    "time": "02:25",
                    "gender": 1,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["shi_type"], "身旺")
        self.assertEqual(payload["shi_type_ratio"]["basis"], "element_energy")
        self.assertAlmostEqual(payload["shi_type_ratio"]["same_ratio"], 0.60)
        self.assertAlmostEqual(payload["shi_type_ratio"]["different_ratio"], 0.40)
        self.assertAlmostEqual(payload["shi_type_ratio"]["delta"], 0.20)

    def test_query_response_contains_gouka_adjusted_energy_payload(self):
        with patch("builtins.print"):
            response = self.client.post(
                "/api/query",
                {
                    "date": "1997-02-14",
                    "time": "02:25",
                    "gender": 1,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("element_energy_adjusted", payload)
        self.assertIn("shi_type_ratio_adjusted", payload)
        self.assertIn("shi_type_adjusted", payload)
        self.assertEqual(payload["element_energy_adjusted"]["basis"], "gouka_resolved")
        self.assertEqual(
            payload["element_energy_adjusted"]["basis_detail"],
            "gouka_resolved_tsukirei_tempered",
        )
        self.assertEqual(payload["shi_type_ratio_adjusted"]["basis"], "element_energy_gouka_adjusted")
        self.assertEqual(set(payload["element_energy_adjusted"]["energy"].keys()), {"木", "火", "土", "金", "水"})
        self.assertIsInstance(payload["element_energy_adjusted"]["adjustments"], list)
        season_adjustments = [
            item for item in payload["element_energy_adjusted"]["adjustments"]
            if "season_factor" in item
        ]
        self.assertTrue(season_adjustments)
        self.assertIn("season_month", season_adjustments[0])
        self.assertIn("season_coefficient", season_adjustments[0])

    def test_query_response_contains_precision_chart_payload(self):
        with patch("builtins.print"):
            response = self.client.post(
                "/api/query",
                {
                    "date": "1997-02-14",
                    "time": "02:25",
                    "gender": 1,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("precision_chart", payload)
        self.assertIn("flow_month", payload["precision_chart"])
        self.assertIn("flow_year", payload["precision_chart"])
        self.assertIn("active_daiun", payload["precision_chart"])
        self.assertIn("flow_months", payload["precision_chart"])
        self.assertIn("flow_days", payload["precision_chart"])
        self.assertIn("flow_day", payload["precision_chart"])

    def test_query_response_masks_time_pillar_when_birth_time_is_unknown(self):
        with patch("builtins.print"):
            response = self.client.post(
                "/api/query",
                {
                    "date": "1997-02-14",
                    "time": "",
                    "time_unknown": True,
                    "gender": 1,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["birth_time_unknown"])
        self.assertEqual(payload["birth_time_display"], "時刻不明")
        self.assertEqual(payload["tenkan"][3], "不明")
        self.assertEqual(payload["chishi"][3], "不明")
        self.assertEqual(payload["junshi"]["tenkan"][3], "不明")
        self.assertEqual(payload["precision_chart"]["natal"]["time"]["tenkan"], "不明")

    def test_precision_flow_endpoint_returns_selectable_year_month_day_payload(self):
        with patch("builtins.print"):
            response = self.client.post(
                "/api/precision-flow",
                {
                    "date": "1997-02-14",
                    "time": "02:25",
                    "gender": 1,
                    "year": 2026,
                    "month_index": 4,
                    "day_index": 0,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["flow_year_value"], 2026)
        self.assertIn("flow_year", payload)
        self.assertEqual(payload["flow_year"]["kanshi"], "丙午")
        self.assertIn("flow_months", payload)
        self.assertIn("flow_days", payload)
        self.assertTrue(payload["flow_days"]["items"])
        self.assertEqual(payload["flow_day"], payload["flow_days"]["items"][0])
        self.assertIn("selected_month_index", payload)
        self.assertIn("selected_day_index", payload)


class BunsekiExistingOnlyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="profile-user", password="test-password")
        self.admin = User.objects.create_superuser(username="chat-admin", password="test-password")
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.user)
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)

    def create_profile(self):
        return MeishikiRecord.objects.create(
            name="cached-profile",
            birthDate=timezone.make_aware(datetime.datetime(1997, 2, 14, 2, 25)),
            gender="M",
            owner=self.user,
        )

    def parse_sse_events(self, response):
        body = b"".join(response.streaming_content).decode("utf-8")
        events = []

        for raw_event in body.strip().split("\n\n"):
            if not raw_event.strip():
                continue
            data_lines = [line[5:].strip() for line in raw_event.splitlines() if line.startswith("data:")]
            if not data_lines:
                continue
            events.append(json.loads("".join(data_lines)))

        return events

    def test_gpt_existing_only_returns_cached_bunseki(self):
        profile = self.create_profile()
        Bunseki.objects.create(
            meishiki=profile,
            content=[{"entity": "cached", "content": "already exists"}],
            element_insights={
                "year.stem": {
                    "key": "year.stem",
                    "pillar": "year",
                    "part": "stem",
                    "pillarLabel": "年柱",
                    "partLabel": "天干",
                    "symbol": "丁",
                    "tsuhen": "比肩",
                    "title": "年柱天干丁火",
                    "content": "这是中文说明。",
                }
            },
            reason="cached reason",
        )

        response = self.api_client.get(f"/api/gpt?meishiki_id={profile.id}&existing_only=1")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "cached")
        self.assertEqual(payload["reason"], "cached reason")
        self.assertEqual(payload["element_insights"]["year.stem"]["title"], "年柱天干丁火")

    def test_gpt_existing_only_does_not_generate_when_missing(self):
        profile = self.create_profile()

        with patch("suimei.views.analyze_bazi", side_effect=AssertionError("should not generate")):
            response = self.api_client.get(f"/api/gpt?meishiki_id={profile.id}&existing_only=1")

        self.assertEqual(response.status_code, 204)

    def test_gpt_requires_login(self):
        profile = self.create_profile()

        response = self.client.get(f"/api/gpt?meishiki_id={profile.id}&existing_only=1")

        self.assertEqual(response.status_code, 401)

    def test_admin_force_refresh_regenerates_even_when_cached(self):
        admin = User.objects.create_superuser(username="admin-force", password="test-password")
        profile = self.create_profile()
        Bunseki.objects.create(
            meishiki=profile,
            content=[{"entity": "cached", "content": "already exists"}],
            reason="cached reason",
        )
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin)

        with patch("builtins.print"), patch(
            "suimei.views.analyze_bazi",
            side_effect=[
                {"payload": [{"entity": "fresh", "content": "regenerated"}], "reason": "new reason"},
                {"payload": {}},
            ],
        ):
            response = admin_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "fresh")
        self.assertEqual(payload["reason"], "new reason")

    def test_admin_force_refresh_normalizes_element_insight_payload(self):
        profile = self.create_profile()
        admin = User.objects.create_superuser(username="admin-element-insight", password="test-password")
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin)

        with patch("builtins.print"), patch(
            "suimei.views.analyze_bazi",
            side_effect=[
                {
                    "payload": [{"entity": "fresh", "content": "regenerated"}],
                    "reason": "new reason",
                },
                {
                    "payload": {
                        "year.stem": {
                            "title": "年柱天干丁火",
                            "content": "这是中文要素解读。",
                        }
                    },
                },
            ],
        ):
            response = admin_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "fresh")
        self.assertEqual(payload["element_insights"]["year.stem"]["symbol"], "丁")
        self.assertEqual(payload["element_insights"]["year.stem"]["title"], "年柱天干丁火")
        self.assertEqual(payload["element_insights"]["year.stem"]["content"], "这是中文要素解读。")

    def test_admin_force_refresh_keeps_sections_when_element_insight_generation_fails(self):
        profile = self.create_profile()
        admin = User.objects.create_superuser(username="admin-element-insight-fail", password="test-password")
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin)

        with patch("builtins.print"), patch(
            "suimei.views.analyze_bazi",
            side_effect=[
                {"payload": [{"entity": "fresh", "content": "regenerated"}], "reason": "new reason"},
                DeepseekError("insight failed"),
            ],
        ):
            response = admin_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "fresh")
        self.assertEqual(payload["reason"], "new reason")
        self.assertEqual(payload["element_insights"], {})

    def test_gpt_stream_returns_progress_and_result(self):
        profile = self.create_profile()

        with patch("builtins.print"), patch(
            "suimei.views.analyze_bazi",
            side_effect=[
                {"payload": [{"entity": "fresh", "content": "regenerated"}], "reason": "new reason"},
                {"payload": {"year.stem": {"title": "年柱天干丁火", "content": "这是中文要素解读。"}}},
            ],
        ):
            response = self.admin_client.post(
                "/api/gpt/stream",
                {"meishiki_id": profile.id, "force": True},
                content_type="application/json",
            )
            events = self.parse_sse_events(response)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        self.assertEqual(response["X-Accel-Buffering"], "no")
        progress_events = [event for event in events if event.get("type") == "progress"]
        stages = [event["stage"] for event in progress_events]
        self.assertEqual(
            stages,
            [
                "loading_chart",
                "building_prompt",
                "generating_sections",
                "generating_elements",
                "saving",
                "completed",
            ],
        )
        self.assertEqual(progress_events[-1]["progress"], 100)
        self.assertEqual(events[-1]["type"], "result")
        self.assertEqual(events[-1]["payload"]["content"][0]["entity"], "fresh")
        self.assertEqual(events[-1]["payload"]["element_insights"]["year.stem"]["title"], "年柱天干丁火")

    def test_gpt_stream_returns_result_when_element_insight_generation_fails(self):
        profile = self.create_profile()

        with patch("builtins.print"), patch(
            "suimei.views.analyze_bazi",
            side_effect=[
                {"payload": [{"entity": "fresh", "content": "regenerated"}], "reason": "new reason"},
                DeepseekError("insight failed"),
            ],
        ):
            response = self.admin_client.post(
                "/api/gpt/stream",
                {"meishiki_id": profile.id, "force": True},
                content_type="application/json",
            )
            events = self.parse_sse_events(response)
        self.assertEqual(events[-1]["type"], "result")
        self.assertEqual(events[-1]["payload"]["content"][0]["entity"], "fresh")
        self.assertEqual(events[-1]["payload"]["element_insights"], {})

    def test_non_admin_cannot_force_refresh_stream(self):
        profile = self.create_profile()

        response = self.api_client.post(
            "/api/gpt/stream",
            {"meishiki_id": profile.id, "force": True},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_force_refresh(self):
        profile = self.create_profile()

        response = self.api_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 403)

    def test_gpt_chat_requires_login(self):
        profile = self.create_profile()

        response = self.client.post(
            "/api/gpt/chat",
            {"meishiki_id": profile.id, "question": "Explain this chart"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_gpt_chat_requires_admin(self):
        profile = self.create_profile()

        response = self.api_client.post(
            "/api/gpt/chat",
            {"meishiki_id": profile.id, "question": "Explain this chart"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_gpt_chat_requires_question(self):
        profile = self.create_profile()

        response = self.admin_client.post(
            "/api/gpt/chat",
            {"meishiki_id": profile.id, "question": " "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_gpt_chat_returns_answer_with_existing_bunseki_context(self):
        profile = self.create_profile()
        Bunseki.objects.create(
            meishiki=profile,
            content=[{"entity": "cached", "content": "already exists"}],
            reason="cached reason",
        )

        with patch(
            "builtins.print"
        ), patch(
            "suimei.views.generate_chat_reply_payload",
            return_value={"answer": "chat answer", "reasoning": "chat reasoning"},
        ) as mocked_chat:
            response = self.admin_client.post(
                "/api/gpt/chat",
                {
                    "meishiki_id": profile.id,
                    "question": "What is the main pattern?",
                    "history": [{"role": "user", "content": "previous question"}],
                    "chart_context": {"shi_type": "sample"},
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "chat answer")
        self.assertEqual(response.json()["reasoning"], "chat reasoning")
        messages = mocked_chat.call_args.kwargs["messages"]
        serialized = "\n".join(str(message["content"]) for message in messages)
        self.assertIn("already exists", serialized)
        self.assertIn("previous question", serialized)
        self.assertIn("What is the main pattern?", serialized)
        self.assertIn("CHAT命局与近期运势参考", serialized)
        self.assertIn("当前大运", serialized)
        self.assertIn("当前流年", serialized)
        self.assertIn("当前流月", serialized)
        self.assertIn("当前大运/流年/流月与原局干支关系", serialized)
        self.assertNotIn("输出必须是 JSON 数组形式", serialized)

    def test_gpt_chat_stream_returns_streaming_chunks(self):
        profile = self.create_profile()

        with patch("builtins.print"), patch(
            "suimei.views.stream_chat_reply_events",
            return_value=iter(
                [
                    {"type": "reasoning", "delta": "think"},
                    {"type": "content", "delta": "hello"},
                    {"type": "content", "delta": " stream"},
                    {"type": "done"},
                ]
            ),
        ) as mocked_stream:
            response = self.admin_client.post(
                "/api/gpt/chat/stream",
                {
                    "meishiki_id": profile.id,
                    "question": "Stream this answer",
                    "history": [],
                    "chart_context": {"shi_type": "sample"},
                },
                content_type="application/json",
            )

            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.streaming)
            self.assertEqual(response["X-Accel-Buffering"], "no")
            self.assertEqual(response["Cache-Control"], "no-cache")
            body = b"".join(response.streaming_content).decode("utf-8")

        self.assertIn('"type": "reasoning"', body)
        self.assertIn('"delta": "hello"', body)
        self.assertIn('"type": "done"', body)
        messages = mocked_stream.call_args.kwargs["messages"]
        serialized = "\n".join(str(message["content"]) for message in messages)
        self.assertIn("Stream this answer", serialized)

    def test_gpt_chat_service_is_not_implemented_in_deepseek_module(self):
        import suimei.service.deepseek as deepseek
        import suimei.service.llm_chat as llm_chat

        self.assertFalse(hasattr(deepseek, "chat_bazi"))
        self.assertTrue(hasattr(llm_chat, "generate_chat_reply"))
        self.assertTrue(hasattr(llm_chat, "stream_chat_reply"))


class MeishikiProfilePermissionTests(TestCase):
    def test_profile_api_requires_login(self):
        response = self.client.get("/api/meishiki/")

        self.assertEqual(response.status_code, 401)

    def test_profile_api_returns_only_current_user_profiles(self):
        user = User.objects.create_user(username="owner", password="test-password")
        other = User.objects.create_user(username="other", password="test-password")
        own_profile = MeishikiRecord.objects.create(
            name="own",
            birthDate=timezone.make_aware(datetime.datetime(1997, 2, 14, 2, 25)),
            gender="M",
            owner=user,
        )
        MeishikiRecord.objects.create(
            name="other",
            birthDate=timezone.make_aware(datetime.datetime(1998, 3, 15, 3, 30)),
            gender="F",
            owner=other,
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/meishiki/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], own_profile.id)

    def test_admin_profile_api_returns_all_profiles(self):
        user = User.objects.create_user(username="owner", password="test-password")
        admin = User.objects.create_superuser(username="admin", password="test-password")
        MeishikiRecord.objects.create(
            name="own",
            birthDate=timezone.make_aware(datetime.datetime(1997, 2, 14, 2, 25)),
            gender="M",
            owner=user,
        )
        MeishikiRecord.objects.create(
            name="legacy",
            birthDate=timezone.make_aware(datetime.datetime(1998, 3, 15, 3, 30)),
            gender="F",
            owner=None,
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get("/api/meishiki/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)


class RegistrationDisabledTests(TestCase):
    def test_registration_api_is_disabled(self):
        response = self.client.post(
            "/api/user/register/",
            {
                "username": "new-user",
                "password": "test-password",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)


class CurrentUserViewTests(TestCase):
    def test_current_user_view_returns_admin_flag(self):
        admin = User.objects.create_superuser(username="admin-user", password="test-password")
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get("/api/me")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["username"], "admin-user")
        self.assertTrue(payload["is_admin"])


class GoukaResolutionTests(TestCase):
    def build_stub_meishiki(self, kan_elements, shi_elements, zoukan_elements):
        return {
            "kan": [{"element": element, "tsuhen": ""} for element in kan_elements],
            "shi": [
                {
                    "element": shi_elements[idx],
                    "tsuhen": "",
                    "zoukan": [
                        {"element": z, "tsuhen": ""} if z else {"element": False, "tsuhen": False}
                        for z in zoukan_elements[idx]
                    ],
                }
                for idx in range(4)
            ],
        }

    def test_gouka_separates_he_from_hua(self):
        meishiki = self.build_stub_meishiki(
            ["甲", "己", "辛", "壬"],
            ["辰", "丑", "未", "戌"],
            [
                ["戊", "乙", "癸"],
                ["己", "辛", "癸"],
                ["己", "乙", "丁"],
                ["戊", "丁", "辛"],
            ],
        )

        gouka = Gouka(meishiki).gouka

        self.assertTrue(any(item["type"] == "干合" for item in gouka["kan"]))
        self.assertFalse(any(item["type"] == "合化" for item in gouka["kan"]))
        self.assertTrue(any(item["type"] == "干化" for item in gouka["resolved"]["effective_kan"]))

    def test_chart_level_resolution_can_weaken_raw_relation(self):
        meishiki = self.build_stub_meishiki(
            ["甲", "乙", "丙", "丁"],
            ["子", "丑", "午", "卯"],
            [
                ["癸", None, None],
                ["己", "辛", "癸"],
                ["丁", "己", None],
                ["乙", None, None],
            ],
        )

        gouka = Gouka(meishiki).gouka
        zi_chou_he = next(item for item in gouka["resolved"]["shi"] if item["type"] == "支合")
        zi_wu_chong = next(item for item in gouka["resolved"]["shi"] if item["type"] == "支沖")

        self.assertIn(zi_chou_he["state"], {"減力", "失效"})
        self.assertEqual(zi_wu_chong["state"], "成立")

    def test_gouka_detects_sanhe_and_banhe(self):
        sanhe_meishiki = self.build_stub_meishiki(
            ["甲", "乙", "丙", "丁"],
            ["申", "子", "辰", "午"],
            [
                ["庚", "壬", "戊"],
                ["癸", None, None],
                ["戊", "乙", "癸"],
                ["丁", "己", None],
            ],
        )
        banhe_meishiki = self.build_stub_meishiki(
            ["甲", "乙", "丙", "丁"],
            ["申", "子", "丑", "午"],
            [
                ["庚", "壬", "戊"],
                ["癸", None, None],
                ["己", "辛", "癸"],
                ["丁", "己", None],
            ],
        )

        sanhe_gouka = Gouka(sanhe_meishiki).gouka
        banhe_gouka = Gouka(banhe_meishiki).gouka

        sanhe = next(item for item in sanhe_gouka["shi"] if item["type"] == "三合局")
        banhe = next(item for item in banhe_gouka["shi"] if item["type"] == "半合")

        self.assertEqual(sanhe["element"], ["申", "子", "辰"])
        self.assertEqual(sanhe["to"], "水")
        self.assertEqual(banhe["element"], ["申", "子"])
        self.assertEqual(banhe["to"], "水")

    def test_gouka_detects_sanhui_without_adjacent_branches(self):
        sanhui_meishiki = self.build_stub_meishiki(
            ["丙", "乙", "癸", "癸"],
            ["子", "未", "丑", "亥"],
            [
                ["癸", None, None],
                ["己", "丁", "乙"],
                ["己", "辛", "癸"],
                ["壬", "甲", None],
            ],
        )

        sanhui_gouka = Gouka(sanhui_meishiki).gouka
        sanhui = next(item for item in sanhui_gouka["shi"] if item["type"] == "三会局")

        self.assertEqual(sanhui["element"], ["亥", "子", "丑"])
        self.assertEqual(sanhui["index"], [3, 0, 2])
        self.assertEqual(sanhui["to"], "水")


class PromptBuilderTests(TestCase):
    def test_prompt_includes_gouka_resolution_reference(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("刑冲破害・合化裁决", serialized)
        self.assertIn("Chart-level裁决", serialized)
        self.assertIn("不得把所有“合”直接当作“化”", serialized)

    def test_gouka_reference_renders_sanhe_full_members(self):
        text = format_gouka_reference({
            "kan": [],
            "shi": [
                {"type": "三合局", "element": ["申", "子", "辰"], "to": "水"},
                {"type": "半合", "element": ["申", "子"], "to": "水"},
            ],
            "resolved": {"summary": ["地支三合局裁决参照"]},
        })

        self.assertIn("申子辰三合局→水", text)
        self.assertIn("申子半合→水", text)

    def test_gouka_reference_renders_sanhui_full_members(self):
        text = format_gouka_reference({
            "kan": [],
            "shi": [
                {"type": "三会局", "element": ["亥", "子", "丑"], "to": "水"},
            ],
            "resolved": {"summary": ["地支三会局裁决参照"]},
        })

        self.assertIn("亥子丑三会局→水", text)

    def test_prompt_includes_shin_type_ratio_reference(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("日主旺衰判断", serialized)
        self.assertIn("原局判定", serialized)
        self.assertIn("同行", serialized)
        self.assertIn("異行", serialized)
        self.assertIn("制化裁決補正後参考", serialized)

    def test_shin_type_reference_includes_sanhe_adjustment_detail(self):
        relation = {"木": "財", "火": "官", "土": "印", "金": "比劫", "水": "食傷"}
        bazi = SimpleNamespace(
            shin_type="身弱",
            shin_type_adjusted="身中",
            shin_type_ratio={"same_ratio": 0.45, "different_ratio": 0.55, "delta": -0.10},
            shin_type_ratio_adjusted={"same_ratio": 0.50, "different_ratio": 0.50, "delta": 0.0},
            element_energy={"energy": TEST_ENERGY, "relation": relation},
            element_energy_adjusted={
                "energy": {"木": 110.0, "火": 75.0, "土": 50.0, "金": 35.0, "水": 130.0},
                "relation": relation,
                "basis_detail": "gouka_resolved_tsukirei_tempered",
                "adjustments": [
                    {
                        "type": "支化",
                        "source_type": "三合局",
                        "relation_element": ["申", "子", "辰"],
                        "to": "水",
                        "action": "化入",
                        "element": "水",
                        "delta": 30.0,
                        "season_factor": 1.2,
                    }
                ],
            },
        )

        text = format_shin_type_reference(bazi)

        self.assertIn("三合局", text)
        self.assertIn("制化裁決補正明細", text)
        self.assertIn("申子辰", text)
        self.assertIn("补正依据", text)
        self.assertIn("反映刑、冲、破、害", text)
        self.assertNotIn("補正根拠", text)
    def test_shin_type_reference_includes_sanhui_adjustment_detail(self):
        relation = {"木": "財", "火": "官", "土": "印", "金": "比劫", "水": "食傷"}
        bazi = SimpleNamespace(
            shin_type="身弱",
            shin_type_adjusted="身中",
            shin_type_ratio={"same_ratio": 0.45, "different_ratio": 0.55, "delta": -0.10},
            shin_type_ratio_adjusted={"same_ratio": 0.50, "different_ratio": 0.50, "delta": 0.0},
            element_energy={"energy": TEST_ENERGY, "relation": relation},
            element_energy_adjusted={
                "energy": {"木": 110.0, "火": 75.0, "土": 50.0, "金": 35.0, "水": 130.0},
                "relation": relation,
                "basis_detail": "gouka_resolved_tsukirei_tempered",
                "adjustments": [
                    {
                        "type": "支化",
                        "source_type": "三会局",
                        "relation_element": ["亥", "子", "丑"],
                        "to": "水",
                        "action": "化入",
                        "element": "水",
                        "delta": 30.0,
                        "season_factor": 1.2,
                    }
                ],
            },
        )

        text = format_shin_type_reference(bazi)

        self.assertIn("三会局", text)
        self.assertIn("亥子丑", text)

    def test_prompt_includes_sanhui_gouka_reference(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)
        meishi.gouka = {
            "kan": [],
            "shi": [
                {"type": "三会局", "element": ["亥", "子", "丑"], "to": "水"},
            ],
            "resolved": {"summary": ["地支三会局裁决参照"]},
        }

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("三会局", serialized)
        self.assertIn("亥子丑三会局→水", serialized)

    def test_element_flow_reference_renders_adjacent_and_same_pillar(self):
        bazi = SimpleNamespace(
            tenkan=["丁", "壬", "庚", "辛"],
            chishi=["丑", "寅", "巳", "巳"],
            junshi=[
                ["正官", "食神", "日元", "劫财"],
                [],
                [],
                ["正印", "偏财", "七杀", "七杀"],
            ],
            gouka={
                "kan": [
                    {"type": "干合", "index": [0, 1], "element": ["丁", "壬"], "to": "木"},
                ],
                "shi": [
                    {"type": "支刑", "index": [1, 2], "element": ["寅", "巳"]},
                ],
            },
            birth_time_unknown=False,
        )

        text = format_element_flow_reference(bazi)

        self.assertIn("判定范围：相邻柱", text)
        self.assertIn("年柱天干丁火(正官) × 月柱天干壬水(食神)：干合→木（流通）", text)
        self.assertIn("月柱地支寅木(偏财) × 日柱地支巳火(七杀)：支刑（阻塞）", text)
        self.assertIn("年柱同柱", text)
        self.assertIn("思维回路", text)

    def test_prompt_includes_element_flow_reference_for_thinking_loop(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("流通辅助信息", serialized)
        self.assertIn('"entity": "思维回路"', serialized)
        self.assertIn("思维回路", serialized)
        self.assertIn("优势", serialized)
        self.assertIn("问题卡点", serialized)

    def test_chat_prompt_includes_sanhui_timing_relation(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        precision_chart = {
            "current_date": "2026-07-04",
            "birth_time_unknown": False,
            "natal": {
                "year": {"tenkan": "丙", "chishi": "子"},
                "month": {"tenkan": "乙", "chishi": "未"},
                "day": {"tenkan": "癸", "chishi": "丑"},
                "time": {"tenkan": "癸", "chishi": "亥"},
            },
            "active_daiun": {},
            "flow_year": {},
            "flow_month": {},
        }

        messages = build_chat_prompt_from_meishiki(meishi, precision_chart=precision_chart)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("三会局→水", serialized)
        self.assertIn("原局年柱(子)", serialized)
        self.assertIn("原局日柱(丑)", serialized)
        self.assertIn("原局时柱(亥)", serialized)

    def test_chat_prompt_includes_element_flow_reference_for_thinking_loop(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        messages = build_chat_prompt_from_meishiki(meishi, precision_chart={"natal": {}})
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("原局流通辅助参考", serialized)
        self.assertIn("思维回路", serialized)
        self.assertIn("流通链路", serialized)

    def test_prompt_marks_time_pillar_unknown_when_birth_time_is_unknown(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)
        meishi.birth_time_unknown = True
        meishi.birth_time_display = "時刻不明"

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("時柱不明", serialized)
        self.assertIn("時柱を既知の事実として扱わないでください", serialized)

    def test_prompt_includes_shishen_ratio_reference(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("十神能量占比", serialized)
        self.assertIn("制化補正後参考", serialized)

    def test_prompt_marks_shishen_ratio_reference_as_placeholder_when_birth_time_is_unknown(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)
        meishi.birth_time_unknown = True
        meishi.birth_time_display = "時刻不明"

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)
        serialized = "\n".join(str(message["content"]) for message in messages)

        self.assertIn("十神能量占比", serialized)
        self.assertIn("内部占位時刻ベースの参考値", serialized)

class PromptBuilderLanguageTests(TestCase):
    def test_prompt_does_not_force_traditional_chinese_output(self):
        with patch("builtins.print"):
            meishi = Meishi(TEST_BIRTHDATE, 1)

        with patch("builtins.print"):
            messages = build_prompt_from_meishiki(meishi)

        serialized = "\n".join(str(message["content"]) for message in messages)
        self.assertNotIn("繁體中文", serialized)
        self.assertNotIn("不得使用簡體中文", serialized)
