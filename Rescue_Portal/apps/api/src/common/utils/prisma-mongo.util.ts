/**
 * MongoDB stores unset optional fields as missing rather than null, and Prisma's
 * `{ field: null }` filter only matches explicitly stored nulls. These helpers
 * produce portable filters for the two common cases.
 */

type NullishWhere = {
  AND: Array<{ OR: Array<{ [field: string]: null | { isSet: false } }> }>;
};

type PresentWhere = {
  AND: Array<{ [field: string]: { isSet?: true; not?: null } }>;
};

export function mongoNullish(field: string): NullishWhere {
  return {
    AND: [{ OR: [{ [field]: null }, { [field]: { isSet: false } }] }],
  };
}

export function mongoPresent(...fields: string[]): PresentWhere {
  return {
    AND: [
      ...fields.map((field) => ({ [field]: { isSet: true as const } })),
      ...fields.map((field) => ({ [field]: { not: null } })),
    ],
  };
}
