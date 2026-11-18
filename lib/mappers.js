export function toDoc(record) {
  const { id, ...rest } = record;
  return { _id: id, ...rest };
}

export function fromDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}
