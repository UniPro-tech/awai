{{- define "private-polis.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "private-polis.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "private-polis.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "private-polis.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "private-polis.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "private-polis.selectorLabels" -}}
app.kubernetes.io/name: {{ include "private-polis.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "private-polis.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "private-polis.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "private-polis.secretName" -}}
{{- default (include "private-polis.fullname" .) .Values.existingSecret }}
{{- end }}

{{- define "private-polis.imageTag" -}}
{{- default .Chart.AppVersion .tag }}
{{- end }}

{{- define "private-polis.databaseUrl" -}}
{{- if .Values.postgresql.enabled -}}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" (.Values.postgresql.auth.username | urlquery) (.Values.postgresql.auth.password | urlquery) (include "private-polis.fullname" .) (.Values.postgresql.auth.database | urlquery) -}}
{{- else -}}
{{- .Values.database.url -}}
{{- end -}}
{{- end }}
