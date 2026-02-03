import { useMemo } from 'react';
import { TextInput, View , Text} from 'react-native';

import { useTheme } from '@theme';

import { createStyles } from '../styles/index.styles';
import { InputProps } from '../types/index.type';


const Input = ({ label, value, onChangeText, required, error }: InputProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={theme.text.secondary}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default Input;
