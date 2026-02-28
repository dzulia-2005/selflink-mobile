import { MetalButton } from '@components/MetalButton';
import { ErrorView } from '@components/StateViews';
import { MentorStackParamList } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { t } from 'i18next';
import React, { useMemo } from 'react';
import { SafeAreaView, View } from 'react-native';
import { createStyles } from '../styles/index.styles';
import { useTheme } from '@theme';

type NatalChartErrorProp = {
  loadChart:() => Promise<void>,
  error:string
}

const NatalChartError:React.FC<NatalChartErrorProp> = ({loadChart,error}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const navigation = useNavigation<NativeStackNavigationProp<MentorStackParamList, 'NatalChart'>>();

  return (
    <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorBlock}>
              <ErrorView
                message={error}
                actionLabel={t('common.retry')}
                onRetry={() => loadChart().catch(() => undefined)}
              />
              <MetalButton
                title={t('astro.natal.actions.updateBirthData')}
                onPress={() => navigation.navigate('BirthData')}
              />
            </View>
          </SafeAreaView>
  );
};

export default NatalChartError;
