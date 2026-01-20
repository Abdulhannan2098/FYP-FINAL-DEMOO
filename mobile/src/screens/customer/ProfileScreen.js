import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import theme from '../../styles/theme';
import { getUserAvatarUri, getUserInitial } from '../../utils/userAvatar';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const hasRefreshedOnMount = useRef(false);

  // Only refresh user data once on mount, not on every focus
  // This prevents the blinking/flickering issue
  useFocusEffect(
    useCallback(() => {
      // Only refresh on first mount, subsequent navigations will use cached data
      // User data is already updated when returning from EditProfile via updateUser
      if (!hasRefreshedOnMount.current && typeof refreshUser === 'function') {
        hasRefreshedOnMount.current = true;
        refreshUser();
      }
    }, [refreshUser])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const ProfileItem = ({ label, value }) => (
    <View style={styles.profileItem}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value || 'Not provided'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {getUserAvatarUri(user) ? (
            <Image
              key={getUserAvatarUri(user)}
              source={{
                uri: getUserAvatarUri(user),
              }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={(e) => console.log('Profile image load error:', e.nativeEvent.error)}
            />
          ) : (
            <Text style={styles.avatarText}>
              {getUserInitial(user?.name)}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.card}>
          <ProfileItem label="Name" value={user?.name} />
          <ProfileItem label="Email" value={user?.email} />
          <ProfileItem label="Phone" value={user?.phone} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <Text style={styles.menuItemText}>Edit Profile</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.menuItemText}>My Orders</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
          <Text style={styles.menuItemText}>Change Password</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Terms & Conditions</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900], // #171717
  },
  header: {
    backgroundColor: theme.colors.surface, // #1E1E1E
    alignItems: 'center',
    padding: theme.spacing['3xl'],
    paddingTop: theme.spacing['5xl'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[500], // #B91C1C
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.neonRed,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  name: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, // #E8E8E8
    marginBottom: theme.spacing.xs,
  },
  role: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary, // #B3B3B3
    textTransform: 'capitalize',
  },
  section: {
    marginTop: theme.spacing['3xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, // #E8E8E8
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface, // #1E1E1E
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  profileItem: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  itemLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary, // #8A8A8A
    marginBottom: theme.spacing.xs,
  },
  itemValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary, // #E8E8E8
    fontWeight: theme.typography.fontWeight.medium,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface, // #1E1E1E
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  menuItemText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary, // #E8E8E8
  },
  menuItemArrow: {
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.primary[500], // #B91C1C
  },
  logoutButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing['3xl'],
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary[500], // #B91C1C
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary, // #8A8A8A
  },
});

export default ProfileScreen;
