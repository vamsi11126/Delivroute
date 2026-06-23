import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { ActiveStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<ActiveStackParamList, 'FullRouteList'>;

export function FullRouteListScreen(_props: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="FullRouteList" subtitle="Every stop in delivery order." />
  );
}
