import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getUserAvatarUri, getUserInitial } from '../utils/userAvatar';
import theme from '../styles/theme';

const DrawerItem = ({ icon, label, onPress, badge }) => {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={22} color={theme.colors.text.secondary} />
        <Text style={styles.itemText}>{label}</Text>
      </View>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );
};

const AppDrawerContent = (props) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { getCartCount } = useCart();

  const cartCount = getCartCount ? getCartCount() : 0;

  const navigate = (target) => {
    props.navigation?.closeDrawer?.();
    props.navigation.navigate('Main', target);
  };

  const navigateTab = (tabName, nested) => {
    props.navigation?.closeDrawer?.();
    props.navigation.navigate('Main', {
      screen: tabName,
      ...(nested ? { params: nested } : {}),
    });
  };

  const handleLogout = async () => {
    await logout();
    props.navigation?.closeDrawer?.();
  };

  const renderHeader = () => {
    if (!user) return null;
    return (
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          {getUserAvatarUri(user) ? (
            <Image
              key={getUserAvatarUri(user)}
              source={{ uri: getUserAvatarUri(user) }}
              style={styles.userAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.userAvatarText}>{getUserInitial(user?.name)}</Text>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={[styles.roleBadge, user.role === 'vendor' ? styles.roleVendor : styles.roleCustomer]}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      {...props}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Ionicons name="car-sport" size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.brandText}>AutoSphere</Text>
      </View>

      {renderHeader()}

      {!isAuthenticated ? (
        <View style={styles.section}>
          <DrawerItem icon="home-outline" label="Home" onPress={() => navigate({ screen: 'Landing' })} />
          <DrawerItem icon="grid-outline" label="Products" onPress={() => navigate({ screen: 'Products' })} />
          <DrawerItem icon="log-in-outline" label="Login" onPress={() => navigate({ screen: 'Login' })} />
          <DrawerItem icon="person-add-outline" label="Register" onPress={() => navigate({ screen: 'Register' })} />
          <DrawerItem
            icon="storefront-outline"
            label="Sell on AutoSphere"
            onPress={() => navigate({ screen: 'Register', params: { role: 'vendor' } })}
          />
        </View>
      ) : user?.role === 'vendor' ? (
        <View style={styles.section}>
          <DrawerItem icon="speedometer-outline" label="Dashboard" onPress={() => navigateTab('VendorDashboard')} />
          <DrawerItem icon="cube-outline" label="My Products" onPress={() => navigateTab('VendorProducts')} />
          <DrawerItem icon="receipt-outline" label="Orders" onPress={() => navigateTab('VendorOrders')} />
          <DrawerItem icon="chatbubbles-outline" label="Messages" onPress={() => navigateTab('VendorChat')} />
          <DrawerItem icon="person-outline" label="Profile" onPress={() => navigateTab('VendorProfile')} />

          <TouchableOpacity style={styles.logout} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.brand.main} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <DrawerItem icon="home-outline" label="Home" onPress={() => navigateTab('Home')} />
          <DrawerItem icon="grid-outline" label="Products" onPress={() => navigateTab('Products')} />
          <DrawerItem icon="heart-outline" label="Wishlist" onPress={() => navigateTab('Home', { screen: 'Wishlist' })} />
          <DrawerItem icon="cart-outline" label="Cart" badge={cartCount} onPress={() => navigateTab('Home', { screen: 'Cart' })} />
          <DrawerItem icon="receipt-outline" label="Orders" onPress={() => navigateTab('Orders')} />
          <DrawerItem icon="chatbubbles-outline" label="Messages" onPress={() => navigateTab('Chat')} />
          <DrawerItem icon="person-outline" label="Profile" onPress={() => navigateTab('Profile')} />

          <TouchableOpacity style={styles.logout} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.brand.main} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.secondary[900],
    paddingBottom: theme.spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  brandIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  roleCustomer: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  roleVendor: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'capitalize',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  section: {
    paddingTop: theme.spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  itemText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  badge: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: theme.spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.bold,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  logoutText: {
    color: theme.colors.brand.main,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
});

export default AppDrawerContent;
