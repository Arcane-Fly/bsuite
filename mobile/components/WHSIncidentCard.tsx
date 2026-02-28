import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, MapPin, User } from 'lucide-react-native';
import { Card, Badge } from '@/components/ui';
import { Colors, INCIDENT_TYPE_LABELS, SEVERITY_COLORS } from '@/lib/constants';
import type { WHSIncident } from '@/types';

interface WHSIncidentCardProps {
  incident: WHSIncident;
  onPress?: (id: string) => void;
}

/**
 * Format an ISO datetime string to a short display format.
 */
function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  const day = date.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[date.getMonth()] ?? '???';
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${mins}`;
}

/**
 * WHS incident card showing type, severity, title, and key details.
 */
export function WHSIncidentCard({ incident }: WHSIncidentCardProps) {
  const {
    type,
    severity,
    status,
    title,
    location,
    reportedBy,
    reportedAt,
  } = incident;

  const severityColor = SEVERITY_COLORS[severity] ?? Colors.muted;
  const typeLabel = INCIDENT_TYPE_LABELS[type] ?? type;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View
            style={{ backgroundColor: `${severityColor}20` }}
            className="rounded-lg p-1.5"
          >
            <AlertTriangle size={16} color={severityColor} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <Badge label={status} status={status} />
      </View>

      <View className="flex-row items-center gap-3 mb-1.5">
        <Badge label={typeLabel} variant="muted" />
        <Badge
          label={severity}
          variant={
            severity === 'critical' || severity === 'high'
              ? 'destructive'
              : severity === 'medium'
                ? 'warning'
                : 'success'
          }
        />
      </View>

      <View className="gap-1 mt-1">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={12} color={Colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {location}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <User size={12} color={Colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground">
            {reportedBy} - {formatDateTime(reportedAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
}
