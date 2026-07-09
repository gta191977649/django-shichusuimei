export const UNKNOWN_TIME_TEXT = "時刻不明";
export const UNKNOWN_TIME_FALLBACK = "00:00";

export const normalizeBirthTimeUnknown = (value) => {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

export const getProfileBirthTimeState = (profile = {}) => {
  const [date = "", timeFull = ""] = (profile?.birthDate || "").split("T");
  const birthTimeUnknown = normalizeBirthTimeUnknown(profile?.birthTimeUnknown);

  return {
    date,
    time: birthTimeUnknown ? "" : timeFull.replace("Z", "").slice(0, 5),
    birthTimeUnknown,
  };
};

export const getQueryTimeValue = (time, birthTimeUnknown) =>
  normalizeBirthTimeUnknown(birthTimeUnknown) ? UNKNOWN_TIME_FALLBACK : (time || UNKNOWN_TIME_FALLBACK);

export const buildBirthDateIso = ({ date, time, birthTimeUnknown }, fallback = "") => {
  if (!date) return fallback;
  return `${date}T${getQueryTimeValue(time, birthTimeUnknown)}:00Z`;
};

export const buildProfilePayload = (form) => ({
  name: (form.name || "").trim(),
  birthDate: buildBirthDateIso(form),
  gender: form.gender,
  birthTimeUnknown: normalizeBirthTimeUnknown(form.birthTimeUnknown),
});

export const getBirthTimeDisplay = (time, birthTimeUnknown) =>
  normalizeBirthTimeUnknown(birthTimeUnknown) ? UNKNOWN_TIME_TEXT : (time || "");
