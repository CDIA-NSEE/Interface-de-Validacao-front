import { signIn, signOut, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';

export const signInWithEmail = async (email, password) => {
  const { isSignedIn, nextStep } = await signIn({
    username: email,
    password,
  });

  if (!isSignedIn) {
    throw new Error('Authentication failed');
  }

  const session = await fetchAuthSession();
  const user = await getCurrentUser();

  return {
    access_token: session.tokens?.accessToken?.toString(),
    id_token: session.tokens?.idToken?.toString(),
    user: {
      username: user.username,
      email: user.signInDetails?.loginId,
      name: user.username,
    },
  };
};

export const getCurrentAuthUser = async () => {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    return {
      access_token: session.tokens?.accessToken?.toString(),
      user: {
        username: user.username,
        email: user.signInDetails?.loginId,
        full_name: user.username,
      },
    };
  } catch {
    throw new Error('No valid session');
  }
};

export const signOutUser = async () => {
  await signOut({ global: true });
};