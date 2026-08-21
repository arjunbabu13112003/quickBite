import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  TextInputProps
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1. AUTHENTICATION HEADER
interface AuthHeaderProps {
  onBackPress?: () => void;
  title?: string;
  showBack?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ onBackPress, title, showBack = true }) => {
  return (
    <View style={styles.headerContainer}>
      {showBack && (
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.7} 
          onPress={onBackPress}
        >
          <Ionicons name="arrow-back" size={20} color="#38220F" />
        </TouchableOpacity>
      )}
      {title && <Text style={styles.headerTitle}>{title}</Text>}
    </View>
  );
};

// 2. REUSABLE AUTH INPUT WITH ICON
interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({ icon, error, style, ...props }) => {
  return (
    <View style={styles.inputContainer}>
      <View style={[
        styles.inputWrapper,
        error ? styles.inputWrapperError : null
      ]}>
        <Ionicons name={icon} size={18} color="#8A7A6E" style={styles.inputIcon} />
        <TextInput 
          style={[styles.textInput, style]} 
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// 3. SECURE PASSWORD INPUT WITH EYE TOGGLE
interface PasswordInputProps extends TextInputProps {
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ error, style, ...props }) => {
  const [isSecure, setIsSecure] = useState(true);

  return (
    <View style={styles.inputContainer}>
      <View style={[
        styles.inputWrapper,
        error ? styles.inputWrapperError : null
      ]}>
        <Ionicons name="lock-closed-outline" size={18} color="#8A7A6E" style={styles.inputIcon} />
        <TextInput 
          style={[styles.textInput, style]} 
          secureTextEntry={isSecure}
          placeholderTextColor="#94A3B8"
          {...props}
        />
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => setIsSecure(!isSecure)}
          style={styles.eyeButton}
        >
          <Ionicons 
            name={isSecure ? 'eye-outline' : 'eye-off-outline'} 
            size={18} 
            color="#8A7A6E" 
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// 4. PRIMARY AUTH ACTION BUTTON (ORANGE WITH WHITE TEXT)
interface PrimaryAuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
}

export const PrimaryAuthButton: React.FC<PrimaryAuthButtonProps> = ({ title, onPress, loading = false }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress}
      disabled={loading}
      style={styles.primaryButton}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <Text style={styles.primaryButtonText}>Logging in...</Text>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 8 }} />
        </View>
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
    marginLeft: 16,
  },
  inputContainer: {
    marginBottom: 12,
    width: '100%',
  },
  inputWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#38220F',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#F97316', // Orange
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 15,
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}) as any;
