/** Shared patient-form checks. These also run in services before data is saved. */
export type FieldErrors = Partial<Record<string, string>>;
export const normalizePersonName = (name: string) => name.trim().replace(/\p{Zs}+/gu, ' ');
export const normalizePhoneNumber = (phone: string) => phone.trim().replace(/[ -]/g, '');

export function personNameError(name: string): string | undefined {
 const value = normalizePersonName(name);
 if (value.length < 2) return 'Enter the full name with at least 2 characters.';
 if (value.length > 80) return 'Use 80 characters or fewer for the name.';
 // Combining marks and joiners preserve Sinhala, Tamil and other native names.
 if (!/\p{L}/u.test(value) || !/^[\p{L}\p{M}\p{Zs}.'’\-\u200c\u200d]+$/u.test(name))
  return 'Use letters, spaces, initials, apostrophes or hyphens for the name.';
}

export function emailAddressError(email: string): string | undefined {
 const value = email.trim();
 if (value.length > 254 || /\p{Cc}/u.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  return 'Enter a valid email address, such as name@example.com.';
 const [local, domain] = value.split('@');
 if (local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
  domain.split('.').some(label => !/^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(label)))
  return 'Enter a valid email address, such as name@example.com.';
}

export function phoneNumberError(phone: string, required = true): string | undefined {
 if (!phone.trim() && !required) return;
 if (!/^[+0-9 -]+$/.test(phone.trim()) || !/^(?:0[1-9]\d{8}|\+94[1-9]\d{8})$/.test(normalizePhoneNumber(phone)))
  return 'Enter a 10-digit Sri Lankan phone number (0771234567) or use +94771234567.';
}

export function caregiverAccountError(accountId: string, ownerId?: string): string | undefined {
 const value = accountId.trim();
 if (!value) return;
 if (value.includes('@')) return 'Enter the caregiver’s Account ID from their Account page, rather than an email address.';
 if (value.length > 128 || /[\s/\p{Cc}]/u.test(value)) return 'Copy the caregiver’s Account ID from their Account page, without spaces or slashes.';
 if (value === ownerId) return 'Use the caregiver’s Account ID, rather than your own.';
}

export function patientFormErrors(command: string, fields: Record<string, string>, ownerId?: string): FieldErrors {
 const errors: FieldErrors = {};
 if (['register', 'editPatient', 'caregiver'].includes(command)) {
  const nameKey = command === 'caregiver' ? 'Caregiver name' : 'Full name' in fields ? 'Full name' : 'Patient name';
  const phoneKey = 'Phone number' in fields ? 'Phone number' : 'Contact number';
  errors[nameKey] = personNameError(fields[nameKey] || '');
  errors[phoneKey] = phoneNumberError(fields[phoneKey] || '', command === 'caregiver');
  if (command === 'caregiver') errors['Caregiver account ID'] = caregiverAccountError(fields['Caregiver account ID'] || '', ownerId);
 }
 if (command === 'requestRecovery' || command === 'editRecovery') errors.Reason = recoveryReasonError(fields.Reason || '');
 return Object.fromEntries(Object.entries(errors).filter(([, error]) => error));
}

export function messageError(value: string, label: string, limit: number): string | undefined {
 const trimmed = value.trim();
 if (!trimmed || trimmed.length > limit) return `Enter ${label} between 1 and ${limit.toLocaleString('en-US')} characters.`;
 if (!/[\p{L}\p{N}]/u.test(trimmed)) return 'Add a few words to describe what happened or the help you need.';
 if (/\p{Cc}/u.test(value.replace(/[\r\n\t]/g, ''))) return 'Remove unsupported control characters from the message.';
}
export const recoveryReasonError = (reason: string) => messageError(reason, 'a recovery reason', 500);
export const supportMessageError = (message: string) => messageError(message, 'a support message', 1000);
export function queueTokenError(token: string): string | undefined {
 if (!/^A\d{3,6}$/i.test(token.trim()) || Number(token.trim().slice(1)) < 1)
  return 'Enter a valid CareQueue token, such as A001, from your queue slip.';
}
export function linkedTokenError(entered: string, issuedToken: string): string | undefined {
 return queueTokenError(entered) || (entered.trim().toUpperCase() !== issuedToken
  ? 'This token does not match your registered visit. Ask Counter 03 for assistance.' : undefined);
}

export function requireValidFields(errors: FieldErrors) {
 const message = Object.values(errors).find(Boolean);
 if (message) throw Error(message);
}
