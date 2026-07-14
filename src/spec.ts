import { readFileSync } from "node:fs";

export interface ParamSpec {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enumValues?: string[];
}

export interface Operation {
  resource: string;
  action: string;
  method: "GET" | "POST";
  path: string;
  summary?: string;
  description?: string;
  params: ParamSpec[];
  bodyProps: ParamSpec[];
  bodySchema?: unknown;
}

export type ResourceMap = Map<string, Operation[]>;

export function loadSpec(specPath: string): { info?: { version?: string }; paths: Record<string, Record<string, unknown>> } {
  const raw = readFileSync(specPath, "utf8");
  return JSON.parse(raw);
}

function classifyType(schema: any): { type: string; enumValues?: string[] } {
  if (!schema) return { type: "string" };
  if (schema.enum) return { type: "string", enumValues: schema.enum };
  if (schema.type === "array") return { type: "array" };
  if (schema.type === "object") return { type: "json" };
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf || schema.oneOf;
    const primitive = variants.find((v: any) => v.type && v.type !== "null" && v.type !== "object" && v.type !== "array");
    if (primitive) return { type: primitive.type, enumValues: primitive.enum };
    return { type: "json" };
  }
  return { type: schema.type || "string", enumValues: schema.enum };
}

function paramsFromOperation(op: any): ParamSpec[] {
  const params: ParamSpec[] = [];
  for (const p of op.parameters || []) {
    if (p.in !== "query") continue;
    const { type, enumValues } = classifyType(p.schema);
    params.push({
      name: p.name,
      type,
      required: !!p.required,
      description: p.description,
      enumValues,
    });
  }
  return params;
}

function bodyPropsFromOperation(op: any): { props: ParamSpec[]; schema?: unknown } {
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  if (!schema || schema.type !== "object" || !schema.properties) return { props: [], schema };
  const required: string[] = schema.required || [];
  const props: ParamSpec[] = [];
  for (const [name, propSchema] of Object.entries<any>(schema.properties)) {
    if (propSchema.deprecated) continue;
    const { type, enumValues } = classifyType(propSchema);
    props.push({
      name,
      type,
      required: required.includes(name),
      description: propSchema.description,
      enumValues,
    });
  }
  return { props, schema };
}

export function buildResourceMap(specPath: string): ResourceMap {
  const spec = loadSpec(specPath);
  const map: ResourceMap = new Map();
  for (const [pathStr, methods] of Object.entries(spec.paths)) {
    for (const [methodLower, opUntyped] of Object.entries(methods)) {
      const method = methodLower.toUpperCase();
      if (method !== "GET" && method !== "POST") continue;
      const op = opUntyped as any;
      // Strip leading /v\d+/
      const stripped = pathStr.replace(/^\/v\d+\//, "");
      const segments = stripped.split("/");
      const resource = segments[0];
      const action = segments.slice(1).join("-") || "root";
      const params = paramsFromOperation(op);
      const { props: bodyProps, schema: bodySchema } = bodyPropsFromOperation(op);
      const ops = map.get(resource) || [];
      ops.push({
        resource,
        action,
        method: method as "GET" | "POST",
        path: pathStr,
        summary: op.summary,
        description: op.description,
        params,
        bodyProps,
        bodySchema,
      });
      map.set(resource, ops);
    }
  }
  for (const ops of map.values()) {
    ops.sort((a, b) => {
      if (a.method !== b.method) return a.method === "GET" ? -1 : 1;
      return a.action.localeCompare(b.action);
    });
  }
  return map;
}

export function snakeToKebab(s: string): string {
  return s.replace(/_/g, "-");
}

export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
}
