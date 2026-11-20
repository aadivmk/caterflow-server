import { buildSeed, defaultSettings } from "./seed.js";
import { COLLECTIONS, SETTINGS_COLLECTION, getDb } from "./client.js";
import { fromDoc, toDoc } from "./mappers.js";

export const isCollectionKey = (key) => Object.hasOwn(COLLECTIONS, key);

export async function loadAll(userId) {
  const db = await getDb();
  const filter = { userId };
  const list = (key, sort) =>
    db
      .collection(COLLECTIONS[key])
      .find(filter)
      .sort(sort)
      .toArray()
      .then((docs) => docs.map(fromDoc));

  const [customers, menuItems, menus, bookings, calculations, settingsDoc] = await Promise.all([
    list("customers", { name: 1 }),
    list("menuItems", { name: 1 }),
    list("menus", { name: 1 }),
    list("bookings", { eventDate: 1 }),
    list("calculations", { createdAt: -1 }),
    db.collection(SETTINGS_COLLECTION).findOne({ userId }),
  ]);

  let settings;
  if (settingsDoc) {
    settings = fromDoc(settingsDoc);
  } else {
    // First sign-in for this user: seed the full demo dataset.
    const seed = buildSeed();
    for (const key of ["customers", "menuItems", "menus", "bookings"]) {
      if (seed[key].length > 0) {
        await db
          .collection(COLLECTIONS[key])
          .insertMany(seed[key].map((r) => ({ ...toDoc(r), userId })));
      }
    }
    settings = seed.settings;
    const doc = { ...toDoc(settings), userId };
    await db.collection(SETTINGS_COLLECTION).replaceOne({ _id: settings.id }, doc, {
      upsert: true,
    });

    const [seededCustomers, seededMenuItems, seededMenus, seededBookings] = await Promise.all([
      list("customers", { name: 1 }),
      list("menuItems", { name: 1 }),
      list("menus", { name: 1 }),
      list("bookings", { eventDate: 1 }),
    ]);
    return {
      customers: seededCustomers,
      menuItems: seededMenuItems,
      menus: seededMenus,
      bookings: seededBookings,
      calculations,
      settings,
    };
  }
  return { customers, menuItems, menus, bookings, calculations, settings };
}

export async function upsertRecord(key, record, userId) {
  const db = await getDb();
  const doc = { ...toDoc(record), userId };
  await db.collection(COLLECTIONS[key]).replaceOne({ _id: record.id, userId }, doc, {
    upsert: true,
  });
}

export async function removeRecord(key, id, userId) {
  const db = await getDb();
  await db.collection(COLLECTIONS[key]).deleteOne({ _id: id, userId });
  if (key === "menus") {
    await db
      .collection(COLLECTIONS.bookings)
      .updateMany({ menuId: id, userId }, { $set: { menuId: null } });
  }
  if (key === "menuItems") {
    await db
      .collection(COLLECTIONS.menus)
      .updateMany({ itemIds: id, userId }, { $pull: { itemIds: id } });
  }
}

export async function saveSettings(settings, userId) {
  const db = await getDb();
  const doc = { ...toDoc(settings), userId };
  await db.collection(SETTINGS_COLLECTION).replaceOne({ _id: settings.id, userId }, doc, {
    upsert: true,
  });
}

export async function resetDemoData(userId) {
  const db = await getDb();
  await Promise.all([
    ...Object.values(COLLECTIONS).map((name) => db.collection(name).deleteMany({ userId })),
    db.collection(SETTINGS_COLLECTION).deleteMany({ userId }),
  ]);
  const seed = buildSeed();
  for (const key of ["customers", "menuItems", "menus", "bookings"]) {
    if (seed[key].length > 0) {
      await db
        .collection(COLLECTIONS[key])
        .insertMany(seed[key].map((r) => ({ ...toDoc(r), userId })));
    }
  }
  await saveSettings(seed.settings, userId);
  return seed;
}
