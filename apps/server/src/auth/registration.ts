export function registrationEnabled(value = process.env.REGISTRATION_ENABLED): boolean {
  if (value === undefined || value.trim() === "") return true;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

export function localAuthEnabled(value = process.env.LOCAL_AUTH_ENABLED): boolean {
  if (value === undefined || value.trim() === "") return true;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}
