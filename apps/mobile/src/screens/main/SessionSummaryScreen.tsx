import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { ActiveStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<ActiveStackParamList, 'SessionSummary'>;

export function SessionSummaryScreen(_props: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder
      title="Session summary"
      subtitle="Delivered, failed, and skipped at a glance."
    />
  );
}
