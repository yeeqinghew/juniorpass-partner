type DateInput = string | number | Date | null | undefined;

type ChildWithAge = {
  child_dob?: DateInput;
  date_of_birth?: DateInput;
  dob?: DateInput;
  birth_date?: DateInput;
  child_age?: number | string | null;
};

const parseCalendarDate = (value: DateInput): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateParts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateParts) {
    const [, year, month, day] = dateParts.map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateAge = (
  dateOfBirth: DateInput,
  asOfDate: DateInput = new Date(),
): number | null => {
  const birthDate = parseCalendarDate(dateOfBirth);
  const currentDate = parseCalendarDate(asOfDate);

  if (!birthDate || !currentDate || birthDate > currentDate) return null;

  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    currentDate.getMonth() > birthDate.getMonth() ||
    (currentDate.getMonth() === birthDate.getMonth() &&
      currentDate.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;

  return age;
};

export const getChildAge = (
  child?: ChildWithAge | null,
  asOfDate?: DateInput,
): number | null => {
  const dateOfBirth =
    child?.child_dob ??
    child?.date_of_birth ??
    child?.dob ??
    child?.birth_date;
  const calculatedAge = calculateAge(dateOfBirth, asOfDate);

  if (calculatedAge !== null) return calculatedAge;

  if (
    child?.child_age === null ||
    child?.child_age === undefined ||
    child?.child_age === ""
  ) {
    return null;
  }

  const suppliedAge = Number(child.child_age);
  return Number.isFinite(suppliedAge) && suppliedAge >= 0
    ? Math.floor(suppliedAge)
    : null;
};

export const formatChildAge = (
  child?: ChildWithAge | null,
  asOfDate?: DateInput,
): string => {
  const age = getChildAge(child, asOfDate);
  return age === null ? "N/A" : String(age);
};
