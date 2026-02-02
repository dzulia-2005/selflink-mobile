import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigation, RegisterDefaultValuesType } from '../types/index.type';
import { RegisterDefaultValues } from '../components/registerDefaultValues';
import { RegisterSchema } from '../components/schema';



const RegisterScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const register = useAuthStore((state) => state.register);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);

  const {handleSubmit,control,formState:{errors}} = useForm({
    defaultValues: RegisterDefaultValues,
    resolver:zodResolver(RegisterSchema),
  });

  const handleSubmitClick = async(payload:RegisterDefaultValuesType) => {
    try {
      await register(payload);
    } catch (error) {
      console.warn('register failed', error);
    }
  };


  const handleNavigateLogin = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <LinearGradient colors={theme.gradients.matrix} style={styles.cardAccent} />
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Define your handle and sync your personal matrix.
            </Text>
            <Controller
              name='name'
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder="Full name"
                  placeholderTextColor={theme.text.muted}
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}

            <Controller
              name='handle'
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder="Handle"
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
              />
              )}
            />
            {errors.handle ? <Text style={styles.errorText}>{errors.handle.message}</Text> : null}


            <Controller
              name='email'
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}

            <Controller
              name='password'
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}
            <TouchableOpacity
              style={styles.buttonWrapper}
              disabled={isAuthenticating}
              activeOpacity={0.9}
              onPress={handleSubmit(handleSubmitClick)}
            >
              <LinearGradient
                colors={theme.gradients.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, isAuthenticating && styles.buttonDisabled]}
              >
                <Text style={styles.buttonLabel}>
                  {isAuthenticating ? 'Creating…' : 'Create account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={handleNavigateLogin}>
              <Text style={styles.footerText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default RegisterScreen;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl,
      paddingBottom: theme.spacing.xl * 2,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.card,
    },
    cardAccent: {
      position: 'absolute',
      top: -40,
      left: -40,
      width: 160,
      height: 160,
      opacity: 0.18,
      borderRadius: 120,
    },
    title: {
      color: theme.text.primary,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
    input: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.md,
      padding: theme.spacing.lg,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonWrapper: {
      borderRadius: theme.radii.lg,
      ...theme.shadows.button,
    },
    button: {
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonLabel: {
      color: theme.text.primary,
      ...theme.typography.button,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
    },
    footerLink: {
      alignItems: 'center',
    },
    footerText: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
  });
