import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
  BackHandler,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMenu } from '../context/MenuContext';
import { getUserAvatarUri, getUserInitial } from '../utils/userAvatar';
import theme from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.8;

const MenuItem = ({ icon, label, onPress, badge, isActive }) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isActive && styles.menuItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuItemIconContainer, isActive && styles.menuItemIconActive]}>
          <Ionicons
            name={icon}
            size={20}
            color={isActive ? '#FFFFFF' : theme.colors.text.secondary}
          />
        </View>
        <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
          {label}
        </Text>
      </View>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const SlideMenu = () => {
  const { isMenuOpen, closeMenu } = useMenu();
  const { user, isAuthenticated, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isVisible, setIsVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const cartCount = getCartCount ? getCartCount() : 0;

  useEffect(() => {
    if (isMenuOpen) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -MENU_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }
  }, [isMenuOpen, isVisible, overlayAnim, slideAnim]);

  useEffect(() => {
    if (!isVisible) return;
    const onBackPress = () => {
      if (isMenuOpen) {
        closeMenu();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isMenuOpen, isVisible, closeMenu]);

  const navigateTo = (routeName, params = {}) => {
    closeMenu();
    setTimeout(() => {
      navigation.navigate('Main', { screen: routeName, params });
    }, 100);
  };

  const navigateToTab = (tabName, nestedParams = null) => {
    closeMenu();
    setTimeout(() => {
      navigation.navigate('Main', {
        screen: tabName,
        ...(nestedParams ? { params: nestedParams } : null),
      });
    }, 100);
  };

  const handleLogout = async () => {
    closeMenu();
    await logout();
  };

  const renderUserHeader = () => {
    if (!user) return null;
    return (
      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
              {getUserAvatarUri(user) ? (
            <Image
                  key={getUserAvatarUri(user)}
                  source={{ uri: getUserAvatarUri(user) }}
              style={styles.userAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.userAvatarText}>
                  {getUserInitial(user?.name)}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={[styles.roleBadge, user.role === 'vendor' ? styles.roleVendor : styles.roleCustomer]}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderGuestMenu = () => (
    <>
      <MenuItem icon="home-outline" label="Home" onPress={() => navigateTo('Landing')} />
      <MenuItem icon="grid-outline" label="Products" onPress={() => navigateTo('Products')} />
      <View style={styles.divider} />
      <MenuItem icon="log-in-outline" label="Login" onPress={() => navigateTo('Login')} />
      <MenuItem icon="person-add-outline" label="Register" onPress={() => navigateTo('Register')} />
      <View style={styles.divider} />
        <MenuItem
          icon="storefront-outline"
          label="Sell on AutoSphere"
          onPress={() => navigateTo('VendorRegister')}
        />
    </>
  );

  const renderCustomerMenu = () => (
    <>
      <MenuItem icon="home-outline" label="Home" onPress={() => navigateToTab('Home')} />
      <MenuItem icon="grid-outline" label="Products" onPress={() => navigateToTab('Products')} />
      <MenuItem icon="heart-outline" label="Wishlist" onPress={() => navigateToTab('Home', { screen: 'Wishlist' })} />
      <MenuItem icon="cart-outline" label="Cart" badge={cartCount} onPress={() => navigateToTab('Home', { screen: 'Cart' })} />
      <View style={styles.divider} />
      <MenuItem icon="receipt-outline" label="My Orders" onPress={() => navigateToTab('Orders')} />
      <MenuItem icon="chatbubbles-outline" label="Messages" onPress={() => navigateToTab('Chat')} />
      <View style={styles.divider} />
      <MenuItem icon="person-outline" label="Profile" onPress={() => navigateToTab('Profile')} />
    </>
  );

  const renderVendorMenu = () => (
    <>
      <MenuItem icon="speedometer-outline" label="Dashboard" onPress={() => navigateToTab('VendorDashboard')} />
      <MenuItem icon="cube-outline" label="My Products" onPress={() => navigateToTab('VendorProducts')} />
      <MenuItem icon="receipt-outline" label="Orders" onPress={() => navigateToTab('VendorOrders')} />
      <View style={styles.divider} />
      <MenuItem icon="chatbubbles-outline" label="Messages" onPress={() => navigateToTab('VendorChat')} />
      <View style={styles.divider} />
      <MenuItem icon="person-outline" label="Profile" onPress={() => navigateToTab('VendorProfile')} />
    </>
  );

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={closeMenu}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Menu Panel */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            width: MENU_WIDTH,
            paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight : 0),
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="car-sport" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>AutoSphere</Text>
          </View>
          <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* User Info */}
        {renderUserHeader()}

        {/* Menu Items */}
        <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
          {!isAuthenticated
            ? renderGuestMenu()
            : user?.role === 'vendor'
              ? renderVendorMenu()
              : renderCustomerMenu()}

          {/* Logout Button */}
          {isAuthenticated && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
          <Text style={styles.footerText}>AutoSphere Mobile v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.secondary[900],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.surface,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontSize: 22,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleCustomer: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  roleVendor: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roleText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  menuContent: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: `${theme.colors.primary[500]}20`,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemIconActive: {
    backgroundColor: theme.colors.primary[500],
  },
  menuItemText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.secondary[700],
    marginHorizontal: 16,
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
  },
  footerText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SlideMenu;
