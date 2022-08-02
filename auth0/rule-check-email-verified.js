function emailVerified(user, context, callback) {
  if (!user.email_verified) {
    return callback(
      new UnauthorizedError('Please verify your email by clicking the verify link that was emailed to you before logging in.')
    );
  } else {
    return callback(null, user, context);
  }
}
