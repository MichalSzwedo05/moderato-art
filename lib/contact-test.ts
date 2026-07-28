const minimumTestTokenLength = 32;

type ContactTestEnvironment = {
  CONTACT_FORM_ENABLED?: string;
  CONTACT_FORM_RECIPIENT?: string;
  CONTACT_FORM_TEST_ENABLED?: string;
  CONTACT_FORM_TEST_TOKEN?: string;
  RESEND_API_KEY?: string;
};

export function isValidContactTestToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  return token.length >= minimumTestTokenLength && !token.startsWith("replace-with-");
}

export function isContactTestEnabled(environment: ContactTestEnvironment = process.env as unknown as ContactTestEnvironment) {
  return environment.CONTACT_FORM_ENABLED === "true"
    && environment.CONTACT_FORM_TEST_ENABLED === "true"
    && isValidContactTestToken(environment.CONTACT_FORM_TEST_TOKEN)
    && Boolean(environment.RESEND_API_KEY)
    && Boolean(environment.CONTACT_FORM_RECIPIENT);
}
