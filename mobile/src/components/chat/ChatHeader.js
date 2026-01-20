import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const ChatHeader = ({ userName, isOnline, onBack, onOptionsPress, productName }) => {
  const insets = useSafeAreaInsets();

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={[styles.headerOuter, { paddingTop: insets.top }]}>
      <View style={styles.headerInner}>
        <View style={styles.leftSection}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName || 'Unknown'}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]}
              />
              <Text style={[styles.onlineStatus, isOnline && styles.onlineStatusActive]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            {productName && (
              <Text style={styles.productName} numberOfLines={1}>
                Re: {productName}
              </Text>
            )}
          </View>
        </View>

        {onOptionsPress && (
          <TouchableOpacity
            onPress={onOptionsPress}
            style={styles.optionsButton}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerOuter: {
    backgroundColor: theme.colors.brand.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.brand.main,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  onlineStatus: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  onlineStatusActive: {
    color: '#B9F6CA',
  },
  productName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  optionsButton: {
    padding: 8,
    borderRadius: 20,
  },
});

export default ChatHeader;
