import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  sendEmailVerification, reload, validatePassword,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
  type Auth, type User,
} from 'firebase/auth';
import {personNameError,emailAddressError,normalizePersonName} from './patient-validation';

export type RegistrationAccountType='patient'|'staff';
export interface RegistrationFields {name: string; email: string; password: string; confirmPassword: string; accountType:RegistrationAccountType|'';}
export type AccountErrors = Partial<Record<keyof RegistrationFields | 'currentPassword', string>>;
export const normalizeEmail = (email: string) => email.trim();
export function validateAccount(fields: RegistrationFields, registration = true): AccountErrors {
  const errors: AccountErrors = {};
  if(registration&&!['patient','staff'].includes(fields.accountType))errors.accountType='Choose Patient or Staff.';
  if (registration) errors.name = personNameError(fields.name);
  const emailError = emailAddressError(fields.email);
  if (emailError) errors.email = emailError;
  if (!fields.password) errors.password = 'Enter your password.';
  else if (registration && (fields.password.length < 8 || !fields.password.trim())) errors.password = 'Use at least 8 characters, including a character other than a space.';
  if (registration && fields.password !== fields.confirmPassword) errors.confirmPassword = 'Your passwords do not match.';
  return Object.fromEntries(Object.entries(errors).filter(([,error])=>error));
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
  const errors = validateAccount({name: '', email, password, confirmPassword: '',accountType:''}, false);
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}
export async function registerAccount(auth: Auth, fields: RegistrationFields) {
  const errors = validateAccount(fields);
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  await checkPassword(auth, fields.password);
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(fields.email), fields.password);
  // Roles are assigned only by the trusted administrator, never by registration.
  try {await updateProfile(credential.user, {displayName: normalizePersonName(fields.name)});}
  catch {return {...credential, profileSaved: false};}
  return {...credential, profileSaved: true};
}
export async function validateNewPassword(auth:Auth,password:string,confirmation:string){
 if(password.length<8||!password.trim())throw Error('Use at least 8 characters, including a character other than a space.');
 if(password!==confirmation)throw Error('Your new passwords do not match.');
 await checkPassword(auth,password);
}
export async function renameAccount(user: User, name: string) {
  const error=personNameError(name);if(error)throw Error(error);
  await updateProfile(user, {displayName: normalizePersonName(name)});
}
export const verifyAccountEmail = (user: User) => sendEmailVerification(user);
export const reloadAccount = (user: User) => reload(user);
export async function changeAccountPassword(auth: Auth, user: User, currentPassword: string, password: string, confirmPassword: string) {
  if (!user.email || !currentPassword) throw Error('Enter your current password.');
  if (password.length < 8 || !password.trim()) throw Error('Use at least 8 characters, including a character other than a space.');
  if (password !== confirmPassword) throw Error('Your new passwords do not match.');
  await checkPassword(auth, password);
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, password);
}
