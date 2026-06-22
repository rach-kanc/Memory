import { MEMORY_RELATION_TYPES, MEMORY_SCHEMA_VERSION } from "./engine.mjs";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

export const MEMORY_ENTITY_TYPES = Object.freeze([
  "activity_memory",
  "cognitive_schema_memory",
  "schema_memory",
  "intent_memory",
  "reading_preference_memory",
  "feature_output_memory",
  "field_memory",
]);

export const VISIBLE_SCOPE_TYPES = Object.freeze({
  actor_types: ["memact_worker", "app_connector", "user"],
  sensitivity_levels: ["normal", "sensitive", "high"],
  memory_states: [
    "active",
    "accepted",
    "approved",
    "edited",
    "user_verified",
    "pending",
    "forgotten",
    "superseded",
    "deleted",
  ],
});

const RELATION_TYPES = new Set(Object.values(MEMORY_RELATION_TYPES));

const COMMON_MEMORY_KEYS = new Set([
  "id",
  "type",
  "label",
  "summary",
  "strength",
  "survival_score",
  "state",
  "provenance",
  "themes",
  "sources",
  "reasons",
  "first_seen_at",
  "last_seen_at",
  "virtual",
  "cognitive_schema",
  "field_path",
  "category",
  "status",
  "sensitivity",
  "source_app_id",
  "allowed_app_ids",
  "allowed_actor_types",
  "value",
  "path",
  "attributes",
  "decay",
]);

const ENTITY_KEYS = Object.freeze({
  activity_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "meaningful_score",
    "source_packet_id",
    "source_record_id",
  ]),
  cognitive_schema_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "schema_id",
    "schema_packet_id",
    "schema_state",
    "state_label",
    "core_interpretation",
    "action_tendency",
    "emotional_signature",
    "marker_categories",
    "matched_markers",
    "formation_basis",
    "formation_metrics",
    "support",
    "confidence",
    "evidence_packet_ids",
  ]),
  schema_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "schema_id",
    "schema_packet_id",
    "schema_state",
    "state_label",
    "core_interpretation",
    "action_tendency",
    "emotional_signature",
    "marker_categories",
    "matched_markers",
    "formation_basis",
    "formation_metrics",
    "support",
    "confidence",
    "evidence_packet_ids",
  ]),
  intent_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "intent_id",
    "intent_category",
    "confidence",
    "confidence_level",
    "confidence_basis",
    "evidence_ids",
    "evidence",
    "alternative_intents",
    "allowed_actions",
    "blocked_actions",
    "notes",
    "safety",
  ]),
  reading_preference_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "confidence",
    "schema_refs",
    "feature_refs",
    "attributes",
    "schema_id",
    "schema_packet_id",
    "evidence_refs",
  ]),
  feature_output_memory: new Set([
    ...COMMON_MEMORY_KEYS,
    "feature_id",
    "feature_refs",
  ]),
  field_memory: new Set([
    ...COMMON_MEMORY_KEYS,
  ]),
});

const DERIVED_STORE_KEYS = new Set([
  "graph",
  "stats",
  "activity_memories",
  "intent_memories",
  "schema_packets",
  "cognitive_schema_memories",
]);

export function stripDerivedBackupFields(backup = {}) {
  const record = asObject(backup);
  if (!record) return backup;
  const clean = { ...record };
  for (const key of DERIVED_STORE_KEYS) {
    delete clean[key];
  }
  return clean;
}

const ALLOWED_STORE_KEYS = new Set([
  "schema_version",
  "memories",
  "relations",
  "actions",
  "thresholds",
  "source",
  "generated_at",
  "graph_snapshots",
]);

const RELATION_KEYS = new Set([
  "id",
  "from",
  "to",
  "type",
  "category",
  "directed",
  "weight",
  "confidence",
  "evidence",
  "valid_from",
  "valid_until",
  "recorded_at",
  "invalidated_by",
  "from_id",
  "to_id",
  "source_id",
  "target_id",
  "relation",
  "reason",
  "sources",
  "packet_ids",
]);

const ACTION_KEYS = new Set([
  "id",
  "type",
  "memory_id",
  "accepted",
  "reason",
  "payload",
  "occurred_at",
]);

function schemaError(path, message) {
  return { path, message };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function isIsoish(value) {
  return typeof value === "string" && ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function rejectUnknownKeys(record, allowedKeys, pathPrefix, errors) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      errors.push(schemaError(`${pathPrefix}.${key}`, "unknown or spoofed field"));
    }
  }
}

function validateStringField(errors, value, path, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(schemaError(path, "required string"));
    return;
  }
  if (typeof value !== "string") {
    errors.push(schemaError(path, "expected string"));
  }
}

function validateBooleanField(errors, value, path) {
  if (value !== undefined && value !== null && typeof value !== "boolean") {
    errors.push(schemaError(path, "expected boolean"));
  }
}

function validateNumberField(errors, value, path) {
  if (value !== undefined && value !== null && !Number.isFinite(Number(value))) {
    errors.push(schemaError(path, "expected number"));
  }
}

function validateScopeValue(errors, value, path, allowedValues) {
  if (value === undefined || value === null || value === "") return;
  const normalized = String(value).toLowerCase();
  if (!allowedValues.includes(normalized)) {
    errors.push(schemaError(path, `unsupported visible scope type: ${value}`));
  }
}

function validateScopeList(errors, values, path, allowedValues) {
  if (values === undefined || values === null) return;
  if (!Array.isArray(values)) {
    errors.push(schemaError(path, "expected array"));
    return;
  }
  values.forEach((value, index) => {
    validateScopeValue(errors, value, `${path}.${index}`, allowedValues);
  });
}

function validateMemoryEntity(memory, index, errors) {
  const path = `memories.${index}`;
  const record = asObject(memory);
  if (!record) {
    errors.push(schemaError(path, "expected object"));
    return;
  }

  rejectUnknownKeys(record, ENTITY_KEYS[record.type] || new Set(), path, errors);

  validateStringField(errors, record.id, `${path}.id`, { required: true });
  validateStringField(errors, record.type, `${path}.type`, { required: true });
  validateStringField(errors, record.label, `${path}.label`, { required: true });

  if (record.type && !MEMORY_ENTITY_TYPES.includes(record.type)) {
    errors.push(schemaError(`${path}.type`, `unsupported memory entity type: ${record.type}`));
  }

  validateScopeValue(errors, record.state, `${path}.state`, VISIBLE_SCOPE_TYPES.memory_states);
  validateScopeValue(errors, record.status, `${path}.status`, VISIBLE_SCOPE_TYPES.memory_states);
  validateScopeValue(errors, record.sensitivity, `${path}.sensitivity`, VISIBLE_SCOPE_TYPES.sensitivity_levels);
  validateScopeList(errors, record.allowed_actor_types, `${path}.allowed_actor_types`, VISIBLE_SCOPE_TYPES.actor_types);

  validateNumberField(errors, record.strength, `${path}.strength`);
  validateNumberField(errors, record.survival_score, `${path}.survival_score`);
  validateBooleanField(errors, record.virtual, `${path}.virtual`);
  validateBooleanField(errors, record.cognitive_schema, `${path}.cognitive_schema`);

  if (record.themes !== undefined && !Array.isArray(record.themes)) {
    errors.push(schemaError(`${path}.themes`, "expected array"));
  }
  if (record.sources !== undefined && !Array.isArray(record.sources)) {
    errors.push(schemaError(`${path}.sources`, "expected array"));
  }
  if (record.allowed_app_ids !== undefined && !Array.isArray(record.allowed_app_ids)) {
    errors.push(schemaError(`${path}.allowed_app_ids`, "expected array"));
  }
  if (record.provenance !== undefined && !asObject(record.provenance)) {
    errors.push(schemaError(`${path}.provenance`, "expected object"));
  }
  if (record.first_seen_at !== undefined && record.first_seen_at !== "" && !isIsoish(record.first_seen_at)) {
    errors.push(schemaError(`${path}.first_seen_at`, "must be ISO timestamp"));
  }
  if (record.last_seen_at !== undefined && record.last_seen_at !== "" && !isIsoish(record.last_seen_at)) {
    errors.push(schemaError(`${path}.last_seen_at`, "must be ISO timestamp"));
  }
}

function validateRelation(relation, index, errors) {
  const path = `relations.${index}`;
  const record = asObject(relation);
  if (!record) {
    errors.push(schemaError(path, "expected object"));
    return;
  }

  rejectUnknownKeys(record, RELATION_KEYS, path, errors);

  const from = record.from || record.from_id || record.source_id;
  const to = record.to || record.to_id || record.target_id;
  validateStringField(errors, from, `${path}.from`, { required: true });
  validateStringField(errors, to, `${path}.to`, { required: true });
  validateStringField(errors, record.type || record.relation, `${path}.type`, { required: true });

  const relationType = String(record.type || record.relation || "").toLowerCase();
  if (relationType && !RELATION_TYPES.has(relationType)) {
    errors.push(schemaError(`${path}.type`, `unsupported relation type: ${record.type || record.relation}`));
  }
  if (from && to && from === to) {
    errors.push(schemaError(`${path}.to`, "relation cannot point to itself"));
  }
}

function validateAction(action, index, errors) {
  const path = `actions.${index}`;
  const record = asObject(action);
  if (!record) {
    errors.push(schemaError(path, "expected object"));
    return;
  }

  rejectUnknownKeys(record, ACTION_KEYS, path, errors);
  validateStringField(errors, record.id, `${path}.id`, { required: true });
  validateStringField(errors, record.type, `${path}.type`, { required: true });
  validateStringField(errors, record.memory_id, `${path}.memory_id`, { required: true });
  validateBooleanField(errors, record.accepted, `${path}.accepted`);
  if (record.occurred_at !== undefined && record.occurred_at !== "" && !isIsoish(record.occurred_at)) {
    errors.push(schemaError(`${path}.occurred_at`, "must be ISO timestamp"));
  }
}

export function validateMemoryBackupShape(backup = {}) {
  const errors = [];
  const record = asObject(backup);

  if (!record) {
    return {
      ok: false,
      errors: [schemaError("", "backup must be a JSON object")],
      value: null,
    };
  }

  for (const key of Object.keys(record)) {
    if (DERIVED_STORE_KEYS.has(key)) {
      errors.push(schemaError(key, "derived field must not appear in backups"));
      continue;
    }
    if (!ALLOWED_STORE_KEYS.has(key)) {
      errors.push(schemaError(key, "unknown or spoofed store field"));
    }
  }

  validateStringField(errors, record.schema_version, "schema_version", { required: true });
  if (record.schema_version && record.schema_version !== MEMORY_SCHEMA_VERSION) {
    errors.push(schemaError("schema_version", `must be ${MEMORY_SCHEMA_VERSION}`));
  }

  if (!Array.isArray(record.memories)) {
    errors.push(schemaError("memories", "expected array"));
  } else {
    record.memories.forEach((memory, index) => validateMemoryEntity(memory, index, errors));
  }

  if (record.relations !== undefined && !Array.isArray(record.relations)) {
    errors.push(schemaError("relations", "expected array"));
  } else if (Array.isArray(record.relations)) {
    record.relations.forEach((relation, index) => validateRelation(relation, index, errors));
  }

  if (record.actions !== undefined && !Array.isArray(record.actions)) {
    errors.push(schemaError("actions", "expected array"));
  } else if (Array.isArray(record.actions)) {
    record.actions.forEach((action, index) => validateAction(action, index, errors));
  }

  if (record.thresholds !== undefined && !asObject(record.thresholds)) {
    errors.push(schemaError("thresholds", "expected object"));
  }
  if (record.source !== undefined && !asObject(record.source)) {
    errors.push(schemaError("source", "expected object"));
  }
  if (record.generated_at !== undefined && record.generated_at !== "" && !isIsoish(record.generated_at)) {
    errors.push(schemaError("generated_at", "must be ISO timestamp"));
  }
  if (record.graph_snapshots !== undefined && !Array.isArray(record.graph_snapshots)) {
    errors.push(schemaError("graph_snapshots", "expected array"));
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: {
      schema_version: record.schema_version,
      generated_at: record.generated_at,
      source: record.source || {},
      thresholds: record.thresholds || {},
      memories: record.memories,
      relations: record.relations || [],
      actions: record.actions || [],
      graph_snapshots: record.graph_snapshots || [],
    },
  };
}
