const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const env = require('./env');

const normalizeEmail = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized.includes('@')) return normalized;

  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw || '';

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoTag = localRaw.split('+')[0];
    const localCanonical = localNoTag.replace(/\./g, '');
    return `${localCanonical}@gmail.com`;
  }

  return normalized;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLooseEmailMatch = (normalizedEmail) => {
  const pattern = `^\\s*${escapeRegex(normalizedEmail)}\\s*$`;
  return { $regex: pattern, $options: 'i' };
};

// Configure Google OAuth Strategy (only if credentials are provided)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        const emailRaw = profile?.emails?.[0]?.value;
        const normalizedEmail = normalizeEmail(emailRaw);

        // Check if user already exists with this Google ID
        let user = await User.findOne({ authProviderId: profile.id, authProvider: 'google' });

        if (user) {
          // User exists, return user
          return done(null, user);
        }

        // Check if user exists with this email (from local registration)
        const existingUser =
          (await User.findOne({ email: normalizedEmail })) ||
          (await User.findOne({ email: buildLooseEmailMatch(normalizedEmail) }));

        if (existingUser) {
          // Link Google account to existing local account
          existingUser.authProvider = 'google';
          existingUser.authProviderId = profile.id;
          existingUser.avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          existingUser.emailVerified = true; // OAuth users are verified
          await existingUser.save();
          return done(null, existingUser);
        }

        // Create new user
        user = await User.create({
          name: profile.displayName,
          email: normalizedEmail,
          authProvider: 'google',
          authProviderId: profile.id,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          emailVerified: true, // OAuth users are auto-verified
          role: 'customer', // Default role for OAuth users
        });

        done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        done(error, null);
      }
    }
    )
  );
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google login will be disabled.');
  console.warn('   To enable Google login, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.');
  console.warn('   See GOOGLE_OAUTH_SETUP.md for instructions.');
}

// Serialize user for session (not used in JWT approach, but required by passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (not used in JWT approach, but required by passport)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
