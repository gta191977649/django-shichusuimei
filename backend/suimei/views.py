import datetime
from zoneinfo import ZoneInfo

import cnlunar
from cnlunar.config import the60HeavenlyEarth
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .meishiki import Meishi
from .model.bunseki import Bunseki
from .model.meishiki import Meishiki
from .service.deepseek import DeepseekError, analyze_bazi
from .service.prompt_builder import build_prompt_from_meishiki

LOCK_TTL_SEC = 15 * 60  # lock for 15min (long-running)
JST = ZoneInfo("Asia/Tokyo")
PRECISION_MONTH_TERMS = [
    {"key": "立春", "label": "立春"},
    {"key": "惊蛰", "label": "驚蟄"},
    {"key": "清明", "label": "清明"},
    {"key": "立夏", "label": "立夏"},
    {"key": "芒种", "label": "芒種"},
    {"key": "小暑", "label": "小暑"},
    {"key": "立秋", "label": "立秋"},
    {"key": "白露", "label": "白露"},
    {"key": "寒露", "label": "寒露"},
    {"key": "立冬", "label": "立冬"},
    {"key": "大雪", "label": "大雪"},
    {"key": "小寒", "label": "小寒"},
]
NAYIN_NAMES = [
    "海中金",
    "爐中火",
    "大林木",
    "路傍土",
    "釼鋒金",
    "山頭火",
    "澗下水",
    "城頭土",
    "白鑞金",
    "楊柳木",
    "井泉水",
    "屋上土",
    "霹靂火",
    "松柏木",
    "長流水",
    "沙中金",
    "山下火",
    "平地木",
    "壁上土",
    "金箔金",
    "覆燈火",
    "天河水",
    "大駅土",
    "釵釧金",
    "桑柘木",
    "大溪水",
    "沙中土",
    "天上火",
    "柘榴木",
    "大海水",
]


UNKNOWN_PILLAR_TEXT = "不明"
UNKNOWN_BIRTH_TIME_TEXT = "時刻不明"


def _build_nayin(kanshi):
    try:
        return NAYIN_NAMES[the60HeavenlyEarth.index(kanshi) // 2]
    except ValueError:
        return ""


def _build_flow_year_kanshi(flow_year):
    return the60HeavenlyEarth[(int(flow_year) - 4) % 60]


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _apply_birth_time_context(meishi, birth_time_unknown=False, birth_time_display=None):
    meishi.birth_time_unknown = bool(birth_time_unknown)
    meishi.birth_time_display = birth_time_display or (
        UNKNOWN_BIRTH_TIME_TEXT if meishi.birth_time_unknown else meishi.birthdate.strftime("%H:%M")
    )
    return meishi


def _build_unknown_pillar_snapshot():
    return {
        "kanshi": UNKNOWN_PILLAR_TEXT,
        "tenkan": UNKNOWN_PILLAR_TEXT,
        "chishi": UNKNOWN_PILLAR_TEXT,
        "kan_tsuhen": UNKNOWN_PILLAR_TEXT,
        "shi_tsuhen": UNKNOWN_PILLAR_TEXT,
        "zoukan": [{"element": UNKNOWN_PILLAR_TEXT, "tsuhen": UNKNOWN_PILLAR_TEXT} for _ in range(3)],
        "seiun": UNKNOWN_PILLAR_TEXT,
        "jizuo": UNKNOWN_PILLAR_TEXT,
        "kubou": UNKNOWN_PILLAR_TEXT,
        "nayin": UNKNOWN_PILLAR_TEXT,
    }


def _mask_time_pillar_payload(data):
    if not data.get("birth_time_unknown"):
        return data

    for key in ("tenkan", "chishi", "juniunshi"):
        values = data.get(key)
        if isinstance(values, list) and len(values) >= 4:
            values[3] = UNKNOWN_PILLAR_TEXT

    junshi = data.get("junshi")
    if isinstance(junshi, dict):
        for key in ("tenkan", "zoukan_honki", "zoukan_chuki", "zoukan_yoki"):
            values = junshi.get(key)
            if isinstance(values, list) and len(values) >= 4:
                values[3] = UNKNOWN_PILLAR_TEXT

    zoukan = data.get("zoukan")
    if isinstance(zoukan, list) and len(zoukan) >= 4:
        zoukan[3] = [UNKNOWN_PILLAR_TEXT, UNKNOWN_PILLAR_TEXT, UNKNOWN_PILLAR_TEXT]

    precision_chart = data.get("precision_chart")
    if isinstance(precision_chart, dict):
        natal = precision_chart.get("natal")
        if isinstance(natal, dict):
            natal["time"] = _build_unknown_pillar_snapshot()

    return data


def _build_zoukan_payload(meishi, branch):
    payload = []
    for hidden_stem in meishi.getZoukan(branch):
        if hidden_stem:
            payload.append(
                {
                    "element": hidden_stem,
                    "tsuhen": meishi.getKanTsuhen(hidden_stem),
                }
            )
        else:
            payload.append({"element": "", "tsuhen": ""})
    return payload


def _build_pillar_snapshot(meishi, stem, branch):
    zoukan = _build_zoukan_payload(meishi, branch)
    return {
        "kanshi": f"{stem}{branch}",
        "tenkan": stem,
        "chishi": branch,
        "kan_tsuhen": meishi.getKanTsuhen(stem),
        "shi_tsuhen": zoukan[-1]["tsuhen"] if zoukan else "",
        "zoukan": zoukan,
        "seiun": meishi.getJuniunboshi(meishi.higen, branch),
        "jizuo": meishi.getJuniunboshi(stem, branch),
        "kubou": meishi.getKuBou(stem, branch),
        "nayin": _build_nayin(f"{stem}{branch}"),
    }


def _build_meishi_from_payload(payload):
    date_str = payload.get("date")
    birth_time_unknown = _parse_bool(payload.get("time_unknown") or payload.get("birthTimeUnknown"))
    time_str = payload.get("time") or "00:00"
    if birth_time_unknown:
        time_str = "00:00"
    gender = int(payload.get("gender"))

    date_parts = [int(part) for part in date_str.split("-")]
    time_parts = [int(part) for part in time_str.split(":")]
    date_time_obj = datetime.datetime(
        year=date_parts[0],
        month=date_parts[1],
        day=date_parts[2],
        hour=time_parts[0],
        minute=time_parts[1],
    )
    return _apply_birth_time_context(
        Meishi(date_time_obj, gender),
        birth_time_unknown=birth_time_unknown,
        birth_time_display=UNKNOWN_BIRTH_TIME_TEXT if birth_time_unknown else time_str,
    )


def _find_active_daiun_index(year_table, current_year):
    if not year_table:
        return 0

    fallback_index = 0
    for index, group in enumerate(year_table):
        years = [entry["year"] for entry in group.get("list", [])]
        if not years:
            continue
        if years[0] <= current_year <= years[-1]:
            return index
        if current_year >= years[0]:
            fallback_index = index
    return fallback_index


def _build_active_daiun_snapshot(meishi, current_year):
    active_index = _find_active_daiun_index(meishi.yearList, current_year)
    kan_entry = meishi.daiunList["kan"][active_index]
    shi_entry = meishi.daiunList["shi"][active_index]
    group = meishi.yearList[active_index] if active_index < len(meishi.yearList) else {"list": []}
    years = group.get("list", [])

    snapshot = _build_pillar_snapshot(meishi, kan_entry["element"], shi_entry["element"])
    snapshot.update(
        {
            "index": active_index,
            "start_year": years[0]["year"] if years else None,
            "start_age": years[0]["age"] if years else None,
            "end_year": years[-1]["year"] if years else None,
        }
    )
    return snapshot


def _build_flow_month_term_dates(flow_year):
    this_reference = cnlunar.Lunar(datetime.datetime(flow_year, 7, 1, 12, 0), godType="8char")
    next_reference = cnlunar.Lunar(datetime.datetime(flow_year + 1, 7, 1, 12, 0), godType="8char")
    terms = []

    for term in PRECISION_MONTH_TERMS:
        if term["key"] == "小寒":
            target_year = flow_year + 1
            month, day = next_reference.thisYearSolarTermsDic[term["key"]]
        else:
            target_year = flow_year
            month, day = this_reference.thisYearSolarTermsDic[term["key"]]
        terms.append(
            {
                "term_key": term["key"],
                "term": term["label"],
                "date": datetime.date(target_year, month, day),
                "year": target_year,
                "month": month,
                "day": day,
            }
        )
    return terms


def _resolve_period_index(periods, compare_date):
    if not periods:
        return 0

    for index, item in enumerate(periods):
        start_date = item["date"]
        next_date = periods[index + 1]["date"] if index + 1 < len(periods) else None
        if next_date is None:
            if compare_date >= start_date:
                return index
            continue
        if start_date <= compare_date < next_date:
            return index
    return 0


def _resolve_flow_year(current_dt):
    current_year_terms = _build_flow_month_term_dates(current_dt.year)
    risshun = current_year_terms[0]["date"] if current_year_terms else datetime.date(current_dt.year, 2, 4)
    if current_dt.date() < risshun:
        return current_dt.year - 1
    return current_dt.year


def _build_flow_year_snapshot(meishi, flow_year):
    risshun = _build_flow_month_term_dates(flow_year)[0]["date"]
    kanshi = _build_flow_year_kanshi(flow_year)
    snapshot = _build_pillar_snapshot(meishi, kanshi[0], kanshi[1])
    snapshot.update(
        {
            "flow_year": flow_year,
            "date": risshun.isoformat(),
        }
    )
    return snapshot


def _build_flow_months(meishi, flow_year, current_dt=None):
    term_dates = _build_flow_month_term_dates(flow_year)
    months = []

    for item in term_dates:
        term_dt = datetime.datetime(item["year"], item["month"], item["day"], 12, 0)
        lunar = cnlunar.Lunar(term_dt, godType="8char")
        snapshot = _build_pillar_snapshot(meishi, lunar.month8Char[0], lunar.month8Char[1])
        snapshot.update(
            {
                "term": item["term"],
                "term_key": item["term_key"],
                "month": item["month"],
                "day": item["day"],
                "date": item["date"].isoformat(),
                "flow_year": flow_year,
            }
        )
        months.append(snapshot)

    current_index = 0
    if current_dt is not None:
        current_index = _resolve_period_index(term_dates, current_dt.date())

    return {
        "current_index": current_index,
        "items": months,
    }


def _build_flow_days(meishi, flow_year, month_index, month_items, current_dt=None):
    if not month_items:
        return {"current_index": 0, "items": []}

    month_index = max(0, min(month_index, len(month_items) - 1))
    start_date = datetime.date.fromisoformat(month_items[month_index]["date"])
    if month_index + 1 < len(month_items):
        end_date = datetime.date.fromisoformat(month_items[month_index + 1]["date"]) - datetime.timedelta(days=1)
    else:
        next_risshun = _build_flow_month_term_dates(flow_year + 1)[0]["date"]
        end_date = next_risshun - datetime.timedelta(days=1)

    days = []
    cursor = start_date
    while cursor <= end_date:
        day_dt = datetime.datetime(cursor.year, cursor.month, cursor.day, 12, 0)
        lunar = cnlunar.Lunar(day_dt, godType="8char")
        snapshot = _build_pillar_snapshot(meishi, lunar.day8Char[0], lunar.day8Char[1])
        snapshot.update(
            {
                "date": cursor.isoformat(),
                "month": cursor.month,
                "day": cursor.day,
                "display": f"{cursor.month}/{cursor.day}",
            }
        )
        days.append(snapshot)
        cursor += datetime.timedelta(days=1)

    current_index = 0
    if current_dt is not None and start_date <= current_dt.date() <= end_date:
        for index, item in enumerate(days):
            if item["date"] == current_dt.date().isoformat():
                current_index = index
                break

    return {
        "current_index": current_index,
        "items": days,
    }


def _build_daiun_snapshots(meishi):
    snapshots = []
    for index, (kan_entry, shi_entry) in enumerate(zip(meishi.daiunList["kan"], meishi.daiunList["shi"])):
        snapshot = _build_pillar_snapshot(meishi, kan_entry["element"], shi_entry["element"])
        group = meishi.yearList[index] if index < len(meishi.yearList) else {"list": []}
        years = group.get("list", [])
        snapshot.update(
            {
                "index": index,
                "start_year": years[0]["year"] if years else None,
                "start_age": years[0]["age"] if years else None,
                "end_year": years[-1]["year"] if years else None,
            }
        )
        snapshots.append(snapshot)
    return snapshots


def _build_precision_selection_payload(meishi, flow_year, month_index=None, day_index=None, current_dt=None):
    flow_year = int(flow_year)
    flow_year_snapshot = _build_flow_year_snapshot(meishi, flow_year)
    flow_months = _build_flow_months(meishi, flow_year, current_dt=current_dt)
    month_items = flow_months["items"]

    resolved_month_index = flow_months["current_index"]
    if month_items and month_index is not None:
        resolved_month_index = max(0, min(int(month_index), len(month_items) - 1))

    flow_days = _build_flow_days(
        meishi,
        flow_year,
        resolved_month_index,
        month_items,
        current_dt=current_dt,
    )
    day_items = flow_days["items"]
    resolved_day_index = flow_days["current_index"]
    if day_items and day_index is not None:
        resolved_day_index = max(0, min(int(day_index), len(day_items) - 1))

    return {
        "flow_year_value": flow_year,
        "flow_year": flow_year_snapshot,
        "flow_months": flow_months,
        "flow_month": month_items[resolved_month_index] if month_items else None,
        "selected_month_index": resolved_month_index,
        "flow_days": flow_days,
        "flow_day": day_items[resolved_day_index] if day_items else None,
        "selected_day_index": resolved_day_index,
    }


def _build_precision_chart_payload(meishi):
    current_dt_local = datetime.datetime.now(JST)
    current_dt = current_dt_local.replace(tzinfo=None)
    current_flow_year = _resolve_flow_year(current_dt)
    active_daiun = _build_active_daiun_snapshot(meishi, current_flow_year)
    active_year_group = meishi.yearList[active_daiun["index"]] if meishi.yearList else {"list": []}
    active_year_entry = next(
        (item for item in active_year_group.get("list", []) if item["year"] == current_flow_year),
        active_year_group.get("list", [None])[0] if active_year_group.get("list") else None,
    )
    selection = _build_precision_selection_payload(meishi, current_flow_year, current_dt=current_dt)

    return {
        "current_date": current_dt.date().isoformat(),
        "flow_year_value": current_flow_year,
        "flow_year": selection["flow_year"],
        "flow_month": selection["flow_month"],
        "flow_days": selection["flow_days"],
        "flow_day": selection["flow_day"],
        "selected_month_index": selection["selected_month_index"],
        "selected_day_index": selection["selected_day_index"],
        "active_daiun": active_daiun,
        "active_year": active_year_entry,
        "active_year_index": (
            active_year_group.get("list", []).index(active_year_entry)
            if active_year_entry in active_year_group.get("list", [])
            else 0
        ),
        "flow_months": selection["flow_months"],
        "daiun_snapshots": _build_daiun_snapshots(meishi),
        "natal": {
            "year": _build_pillar_snapshot(meishi, meishi.tenkan[0], meishi.chishi[0]),
            "month": _build_pillar_snapshot(meishi, meishi.tenkan[1], meishi.chishi[1]),
            "day": _build_pillar_snapshot(meishi, meishi.tenkan[2], meishi.chishi[2]),
            "time": (
                _build_unknown_pillar_snapshot()
                if getattr(meishi, "birth_time_unknown", False)
                else _build_pillar_snapshot(meishi, meishi.tenkan[3], meishi.chishi[3])
            ),
        },
        "birth_time_unknown": getattr(meishi, "birth_time_unknown", False),
    }


class BunsekiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        meishiki_id = request.query_params.get("meishiki_id")
        if not meishiki_id:
            return Response({"detail": "meishiki_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        force_refresh = str(request.query_params.get("force", "")).lower() in ["1", "true", "yes"]
        if force_refresh and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Only admin users can force regenerate bunseki."}, status=status.HTTP_403_FORBIDDEN)

        meishiki_queryset = Meishiki.objects.all()
        if not (request.user.is_staff or request.user.is_superuser):
            meishiki_queryset = meishiki_queryset.filter(owner=request.user)
        meishiki = get_object_or_404(meishiki_queryset, pk=meishiki_id)

        existing = Bunseki.objects.filter(meishiki_id=meishiki_id).order_by("-id").first()
        if existing and not force_refresh:
            return Response(
                {
                    "content": existing.content,
                    "reason": getattr(existing, "reason", ""),
                    "created_at": existing.created_at.isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        existing_only = str(request.query_params.get("existing_only", "")).lower() in ["1", "true", "yes"]
        if existing_only:
            return Response(status=status.HTTP_204_NO_CONTENT)

        lock_key = f"bunseki:lock:{meishiki_id}"
        if not cache.add(lock_key, "1", timeout=LOCK_TTL_SEC):
            return Response(
                {"status": "processing", "detail": "Bunseki generation in progress."},
                status=status.HTTP_202_ACCEPTED,
                headers={"Retry-After": "5"},
            )

        try:
            dt_value = getattr(meishiki, "birthDate", None) or getattr(meishiki, "datetime", None)
            if isinstance(dt_value, datetime.datetime):
                date_parts = (dt_value.year, dt_value.month, dt_value.day)
                time_parts = (dt_value.hour, dt_value.minute)
            elif isinstance(dt_value, str):
                dt_value = datetime.datetime.fromisoformat(dt_value.replace("Z", "+00:00"))
                date_parts = (dt_value.year, dt_value.month, dt_value.day)
                time_parts = (dt_value.hour, dt_value.minute)
            else:
                return Response({"detail": "Cannot parse datetime from Meishiki record."}, status=status.HTTP_400_BAD_REQUEST)

            raw_gender = getattr(meishiki, "gender", "M")
            gender = 1 if str(raw_gender).lower() in ["m", "male", "男", "1"] else 0
            date_time_obj = datetime.datetime(
                year=date_parts[0],
                month=date_parts[1],
                day=date_parts[2],
                hour=time_parts[0],
                minute=time_parts[1],
            )
            birth_time_unknown = bool(getattr(meishiki, "birthTimeUnknown", False))
            bazi = _apply_birth_time_context(
                Meishi(date_time_obj, int(gender)),
                birth_time_unknown=birth_time_unknown,
                birth_time_display=(
                    UNKNOWN_BIRTH_TIME_TEXT if birth_time_unknown else f"{time_parts[0]:02d}:{time_parts[1]:02d}"
                ),
            )

            try:
                messages = build_prompt_from_meishiki(bazi)
            except Exception as exc:
                return Response({"detail": f"Failed to build bazi text: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                result = analyze_bazi(messages=messages, stream_debug=True)
                content = result.get("payload", [])
                reason = result.get("reason", "")
            except DeepseekError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as exc:
                return Response({"detail": f"AI error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

            obj = Bunseki.objects.create(meishiki_id=meishiki_id, content=content, reason=reason)
            return Response(
                {"content": obj.content, "reason": obj.reason, "created_at": obj.created_at.isoformat()},
                status=status.HTTP_201_CREATED,
            )
        finally:
            cache.delete(lock_key)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "is_staff": bool(request.user.is_staff),
                "is_superuser": bool(request.user.is_superuser),
                "is_admin": bool(request.user.is_staff or request.user.is_superuser),
            },
            status=status.HTTP_200_OK,
        )


class PrecisionFlowView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        meishi = _build_meishi_from_payload(request.data)
        flow_year = int(request.data.get("year"))
        month_index = request.data.get("month_index")
        day_index = request.data.get("day_index")

        payload = _build_precision_selection_payload(
            meishi,
            flow_year=flow_year,
            month_index=month_index,
            day_index=day_index,
        )
        return Response(payload, status=status.HTTP_200_OK)


class SuimeiView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        print(request.data)
        meishi = _build_meishi_from_payload(request.data)
        gender = int(request.data.get("gender"))
        data = {
            "gender": gender,
            "birth": meishi.birthdate,
            "birth_time_unknown": getattr(meishi, "birth_time_unknown", False),
            "birth_time_display": getattr(meishi, "birth_time_display", meishi.birthdate.strftime("%H:%M")),
            "tenkan": list(meishi.tenkan),
            "chishi": list(meishi.chishi),
            "kubou": meishi.kubou,
            "junshi": {
                "tenkan": list(meishi.junshi[0]),
                "zoukan_honki": list(meishi.junshi[3]),
                "zoukan_chuki": list(meishi.junshi[2]),
                "zoukan_yoki": list(meishi.junshi[1]),
            },
            "juniunshi": list(meishi.juniunshi),
            "zoukan": [list(item) for item in meishi.zoukan],
            "shi_type": meishi.shin_type,
            "shi_type_ratio": meishi.shin_type_ratio,
            "shi_type_adjusted": meishi.shin_type_adjusted,
            "shi_type_ratio_adjusted": meishi.shin_type_ratio_adjusted,
            "tsukirei_point": meishi.tsukirei_point,
            "gogyu_point": meishi.gogyu_point,
            "juniun_point": meishi.juniun_point,
            "shi_type_score_legacy": {
                "tsukirei_point": meishi.tsukirei_point,
                "gogyu_point": meishi.gogyu_point,
                "juniun_point": meishi.juniun_point,
                "total": meishi.tsukirei_point + meishi.gogyu_point + meishi.juniun_point,
                "basis": "legacy_score",
            },
            "shi_type_note": meishi.shin_type_note,
            "ritsun_time": meishi.ritsun,
            "younjin": meishi.younjin,
            "kakyoku": meishi.kakyoku,
            "daiun_table": {
                "daiun": meishi.daiunList,
                "year_table": meishi.yearList,
            },
            "element_energy": meishi.element_energy,
            "element_energy_adjusted": meishi.element_energy_adjusted,
            "gouka": meishi.gouka,
            "trend": {
                "daiun": meishi.trend.daiun,
                "suiun": meishi.trend.suiun,
            },
            "precision_chart": _build_precision_chart_payload(meishi),
        }
        data = _mask_time_pillar_payload(data)
        print(meishi.daiunList)

        return Response(data, status=status.HTTP_200_OK)


class CreateUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "User registration is temporarily disabled."},
            status=status.HTTP_403_FORBIDDEN,
        )
