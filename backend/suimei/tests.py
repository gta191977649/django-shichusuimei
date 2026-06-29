import datetime
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from suimei.meishiki import Meishi
from suimei.model.Gouka import Gouka
from suimei.model.bunseki import Bunseki
from suimei.model.meishiki import Meishiki as MeishikiRecord
from suimei.service.prompt_builder import build_prompt_from_meishiki


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
        self.assertEqual(payload["shi_type_ratio_adjusted"]["basis"], "element_energy_gouka_adjusted")
        self.assertEqual(set(payload["element_energy_adjusted"]["energy"].keys()), {"木", "火", "土", "金", "水"})
        self.assertIsInstance(payload["element_energy_adjusted"]["adjustments"], list)

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
        self.assertIn("flow_months", payload)
        self.assertIn("flow_days", payload)
        self.assertIn("selected_month_index", payload)
        self.assertIn("selected_day_index", payload)


class BunsekiExistingOnlyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="profile-user", password="test-password")
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.user)

    def create_profile(self):
        return MeishikiRecord.objects.create(
            name="cached-profile",
            birthDate=timezone.make_aware(datetime.datetime(1997, 2, 14, 2, 25)),
            gender="M",
            owner=self.user,
        )

    def test_gpt_existing_only_returns_cached_bunseki(self):
        profile = self.create_profile()
        Bunseki.objects.create(
            meishiki=profile,
            content=[{"entity": "cached", "content": "already exists"}],
            reason="cached reason",
        )

        response = self.api_client.get(f"/api/gpt?meishiki_id={profile.id}&existing_only=1")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "cached")
        self.assertEqual(payload["reason"], "cached reason")

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

        with patch("builtins.print"), patch("suimei.views.analyze_bazi", return_value={"payload": [{"entity": "fresh", "content": "regenerated"}], "reason": "new reason"}):
            response = admin_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["content"][0]["entity"], "fresh")
        self.assertEqual(payload["reason"], "new reason")

    def test_non_admin_cannot_force_refresh(self):
        profile = self.create_profile()

        response = self.api_client.get(f"/api/gpt?meishiki_id={profile.id}&force=1")

        self.assertEqual(response.status_code, 403)


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
