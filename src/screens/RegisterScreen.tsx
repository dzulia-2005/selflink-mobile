import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import { registerUser } from '@services/api/auth';
import { theme } from '@theme/index';

export function RegisterScreen() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [fullName, setFullName] = useState('');
  const [intention, setIntention] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (isSubmitting) {
      return;
    }
    if (
      !email ||
      !password ||
      !confirmPassword ||
      !handle ||
      !firstName ||
      !lastName ||
      !birthDate ||
      !birthTime ||
      !birthCity ||
      !birthCountry
    ) {
      toast.push({
        message: 'Please fill out all required fields.',
        tone: 'error',
        duration: 4000,
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.push({
        message: 'Passwords do not match.',
        tone: 'error',
        duration: 4000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await registerUser({
        name,
        email,
        password,
        handle,
        fullName,
        intention,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place_city: birthCity,
        birth_place_country: birthCountry,
      });
      await signIn(result);
      toast.push({ message: 'Welcome to Selflink!', tone: 'info', duration: 3000 });
    } catch (error) {
      console.error('Registration failed', error);
      toast.push({
        message: 'Registration failed. Please try again.',
        tone: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Create Your Selflink Account</Text>
          <Text style={styles.subtitle}>
            Metallic gradients, rounded edges, and a thoughtful experience from the first
            tap.
          </Text>

          <MetalPanel glow>
            <Text style={styles.panelTitle}>Sign Up</Text>
            <TextInput
              placeholder="Display Name"
              placeholderTextColor={theme.palette.silver}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Handle"
              placeholderTextColor={theme.palette.silver}
              autoCapitalize="none"
              value={handle}
              onChangeText={setHandle}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.palette.silver}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              placeholder="First name"
              placeholderTextColor={theme.palette.silver}
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
            />
            <TextInput
              placeholder="Last name"
              placeholderTextColor={theme.palette.silver}
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
            />
            <TextInput
              placeholder="Birth date (YYYY-MM-DD)"
              placeholderTextColor={theme.palette.silver}
              value={birthDate}
              onChangeText={setBirthDate}
              style={styles.input}
            />
            <TextInput
              placeholder="Birth time (HH:MM, 24h)"
              placeholderTextColor={theme.palette.silver}
              value={birthTime}
              onChangeText={setBirthTime}
              style={styles.input}
            />
            <TextInput
              placeholder="Birth city"
              placeholderTextColor={theme.palette.silver}
              value={birthCity}
              onChangeText={setBirthCity}
              style={styles.input}
            />
            <TextInput
              placeholder="Birth country"
              placeholderTextColor={theme.palette.silver}
              value={birthCountry}
              onChangeText={setBirthCountry}
              style={styles.input}
            />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={theme.palette.silver}
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />
            <TextInput
              placeholder="Intention"
              placeholderTextColor={theme.palette.silver}
              value={intention}
              onChangeText={setIntention}
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.palette.silver}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={theme.palette.silver}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            <MetalButton
              title={isSubmitting ? 'Creating Account…' : 'Create Account'}
              onPress={handleRegister}
            />
          </MetalPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    color: theme.palette.titanium,
    marginBottom: theme.spacing.sm,
  },
});
