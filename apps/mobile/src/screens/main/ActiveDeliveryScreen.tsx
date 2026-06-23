import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { ActiveStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<ActiveStackParamList, 'ActiveDelivery'>;

export function ActiveDeliveryScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="ActiveDelivery" subtitle="Your live delivery run.">
      <Button title="Full route list" onPress={() => navigation.navigate('FullRouteList')} />
      <Button title="End session" onPress={() => navigation.navigate('SessionSummary')} />
    </ScreenPlaceholder>
  );
}
