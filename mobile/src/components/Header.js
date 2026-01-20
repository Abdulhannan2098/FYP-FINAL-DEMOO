import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useMenu } from '../context/MenuContext';
import { getUserAvatarUri, getUserInitial } from '../utils/userAvatar';
import theme from '../styles/theme';

const Header = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { openMenu } = useMenu();

  const navigateToProfile = () => {
    // Navigate to Profile tab for both customer and vendor
    const parent = navigation.getParent?.();
    if (user?.role === 'vendor') {
      (parent ?? navigation).navigate('VendorProfile');
    } else if (user) {
      (parent ?? navigation).navigate('Profile');
    } else {
      navigation.navigate('Login');
    }
  };

  const navigateHome = () => {
    if (!user) {
      navigation.navigate('Landing');
      return;
    }

    const parent = navigation.getParent?.();
    if (user.role === 'vendor') {
      (parent ?? navigation).navigate('VendorDashboard');
      return;
    }

    (parent ?? navigation).navigate('Home');
  };

  const navigateCustomerNested = (nestedScreen) => {
    const parent = navigation.getParent?.();
    (parent ?? navigation).navigate('Home', { screen: nestedScreen });
  };

  const cartCount = getCartCount ? getCartCount() : 0;
  const wishlistItemCount = typeof wishlistCount === 'number' ? wishlistCount : 0;


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {!user ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={openMenu}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="menu" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.logoContainer}
            onPress={navigateHome}
            activeOpacity={0.7}
          >
            <View style={styles.logoIcon}>
              <Ionicons name="car-sport" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>AutoSphere</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightIcons}>
          {user?.role === 'customer' && (
            <>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigateCustomerNested('Wishlist')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="heart-outline" size={24} color={theme.colors.text.secondary} />
              {wishlistItemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{wishlistItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigateCustomerNested('Cart')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="cart-outline" size={24} color={theme.colors.text.secondary} />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            </>
          )}

          {!!user && (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={navigateToProfile}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {getUserAvatarUri(user) ? (
                <Image
                  key={getUserAvatarUri(user)}
                  source={{ uri: getUserAvatarUri(user) }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileInitial}>
                  <Text style={styles.profileInitialText}>
                    {getUserInitial(user?.name)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.secondary[900],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    ...theme.shadows.soft,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  logoText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  profileButton: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold,
  },
  iconButton: {
    padding: theme.spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
  },

});

export default Header;
