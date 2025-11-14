import { StyleSheet, Text, View } from 'react-native';

export function SocialLoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social login</Text>
      <Text style={styles.subtitle}>
        Connect Google, Facebook, or GitHub to continue. Coming soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#020617',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
