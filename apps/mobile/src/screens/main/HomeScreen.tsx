import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="Home" subtitle="Start a new delivery session.">
      <Button
        title="Add packages"
        onPress={() => navigation.navigate('PackageEntry', { sessionId: 'stub-session' })}
      />
    </ScreenPlaceholder>
  );
}
