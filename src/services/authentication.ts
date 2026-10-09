import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail, sendEmailVerification, reload, validatePassword,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
  type Auth, type User,
} from 'firebase/auth';

export interface RegistrationFields {name: string; email: string; password: string; confirmPassword: string;}
export type AccountErrors = Partial<Record<keyof RegistrationFields | 'currentPassword', string>>;
export const normalizeEmail = (email: string) => email.trim();
export function validateAccount(fields: RegistrationFields, registration = true): AccountErrors {
  const errors: AccountErrors = {};
  if (registration && !fields.name.trim()) errors.name = 'Enter your full name.';
  else if (registration && fields.name.trim().length > 80) errors.name = 'Use 80 characters or fewer.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(fields.email))) errors.email = 'Enter a valid email address.';
  if (!fields.password) errors.password = 'Enter your password.';
  else if (registration && fields.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (registration && fields.password !== fields.confirmPassword) errors.confirmPassword = 'Your passwords do not match.';
  return errors;
}
export function accountError(error: unknown): string {
  const code = (error as {code?: string})?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect. Try again or reset your password.',
    'auth/user-not-found': 'The email or password is incorrect. Try again or reset your password.',
    'auth/wrong-password': 'The email or password is incorrect. Try again or reset your password.',
    'auth/email-already-in-use': 'This email already has an account. Sign in or reset your password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password that meets the requirements below.',
    'auth/password-does-not-meet-requirements': 'Your password does not meet the account password requirements.',
    'auth/too-many-requests': 'Too many attempts. Wait a little before trying again.',
    'auth/network-request-failed': 'Could not connect. Check your internet connection and try again.',
    'auth/user-disabled': 'This account is disabled. Contact your hospital administrator.',
    'auth/requires-recent-login': 'For your security, sign in again before changing your password.',
    'auth/operation-not-allowed': 'Email sign-in is unavailable. Contact your administrator.',
  };
  return (code && messages[code]) || (error instanceof Error && !code ? error.message : 'We could not complete this action. Please try again.');
}
async function checkPassword(auth: Auth, password: string) {
  // The Auth emulator does not implement getPasswordPolicy. Live Firebase still
  // checks the configured policy here and enforces it again on the server.
  if (auth.emulatorConfig) return;
  const status = await validatePassword(auth, password);
  if (status.isValid) return;
  const requirements = [
    status.meetsMinPasswordLength === false ? `at least ${status.passwordPolicy.customStrengthOptions.minPasswordLength || 8} characters` : '',
    status.meetsMaxPasswordLength === false ? 'fewer characters' : '',
    status.containsLowercaseLetter === false ? 'a lowercase letter' : '',
    status.containsUppercaseLetter === false ? 'an uppercase letter' : '',
    status.containsNumericCharacter === false ? 'a number' : '',
    status.containsNonAlphanumericCharacter === false ? 'a symbol' : '',
  ].filter(Boolean);
  throw Error(`Use ${requirements.length ? requirements.join(', ') : 'a stronger password'}.`);
}
export async function signInAccount(auth: Auth, email: string, password: string) {
  const errors = validateAccount({name: '', email, password, confirmPassword: ''}, false);
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}
export async function registerAccount(auth: Auth, fields: RegistrationFields) {
  const errors = validateAccount(fields);
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  await checkPassword(auth, fields.password);
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(fields.email), fields.password);
  // Roles are assigned only by the trusted administrator, never by registration.
  try {await updateProfile(credential.user, {displayName: fields.name.trim()});}
  catch {return {...credential, profileSaved: false};}
  return {...credential, profileSaved: true};
}
export async function resetAccountPassword(auth: Auth, email: string) {
  if (validateAccount({name: '', email, password: 'unused', confirmPassword: ''}, false).email) throw Error('Enter a valid email address.');
  try {await sendPasswordResetEmail(auth, normalizeEmail(email));}
  catch (error) {if ((error as {code?: string}).code !== 'auth/user-not-found') throw error;}
}
export async function renameAccount(user: User, name: string) {
  if (!name.trim() || name.trim().length > 80) throw Error('Enter a name between 1 and 80 characters.');
  await updateProfile(user, {displayName: name.trim()});
}
export const verifyAccountEmail = (user: User) => sendEmailVerification(user);
export const reloadAccount = (user: User) => reload(user);
export async function changeAccountPassword(auth: Auth, user: User, currentPassword: string, password: string, confirmPassword: string) {
  if (!user.email || !currentPassword) throw Error('Enter your current password.');
  if (password.length < 8) throw Error('Use at least 8 characters for your new password.');
  if (password !== confirmPassword) throw Error('Your new passwords do not match.');
  await checkPassword(auth, password);
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, password);
}
