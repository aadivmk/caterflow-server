import { addDays, format } from "date-fns";
import { DEFAULT_ASSUMPTIONS } from "./assumptions.js";
import { computePricing, menuPricePerPerson } from "./pricing.js";

/**
 * Demo dataset for CaterFlow.
 *
 * Every record is flagged `isDemo: true` and shown with a "Demo" tag in the UI.
 * Event dates are generated relative to today, so the dashboard always has
 * past, current and upcoming events. Settings > Demo data restores this set.
 */

/** Stable UUIDs so demo records can reference each other (and work as MongoDB string _id values). */
const seedId = (group, n, prefix = "") =>
  prefix
    ? `${prefix}-${group * 1000 + n}`
    : `00000000-0000-4000-8000-${String(group * 1000 + n).padStart(12, "0")}`;

export const SETTINGS_ID = seedId(9, 1);

export function defaultSettings(now = new Date(), prefix = "") {
  return {
    id: prefix ? `settings-${prefix}` : SETTINGS_ID,
    businessName: "IndiaFeast Caterers",
    ownerName: "Rajesh Kumar",
    phone: "9810012345",
    email: "hello@indiafeast.example",
    address: "Connaught Place, New Delhi 110001",
    gstNumber: "",
    currency: "INR",
    defaultPricePerGuest: 250,
    cateringTeams: 2,
    dailyGuestCapacity: 800,
    calculatorAssumptions: DEFAULT_ASSUMPTIONS,
    updatedAt: now.toISOString(),
  };
}

const CUSTOMERS = [
  ["Arjun Sharma", "9810011201", "arjun.sharma@example.com", "Lajpat Nagar, New Delhi"],
  ["Priya Patel", "9820022302", "priya.patel@example.com", "Bandra West, Mumbai"],
  ["Rahul Reddy", "9830033403", "rahul.reddy@example.com", "Banjara Hills, Hyderabad"],
  ["Sneha Iyer", "9840044504", "sneha.iyer@example.com", "Adyar, Chennai"],
  ["Mohammed Raza", "9850055605", "raza.m@example.com", "Frazer Town, Bengaluru"],
  ["Lakshmi Agarwal", "9860066706", "lakshmi.agarwal@example.com", "C-Scheme, Jaipur"],
  ["Kunal Desai", "9870077807", "kunal.desai@example.com", "Navrangpura, Ahmedabad"],
  ["Pooja Chatterjee", "9880088908", "pooja.c@example.com", "Salt Lake, Kolkata"],
  ["Vikram Singh", "9890099009", "vikram.singh@example.com", "Koregaon Park, Pune"],
  ["Meera Nair", "9900010110", "meera.nair@example.com", "Marine Drive, Kochi"],
];

const ITEMS = [
  ["Masala Chaas", "Welcome Drinks", "Veg", 25, "Spiced buttermilk served chilled."],
  ["Rose Sharbat", "Welcome Drinks", "Vegan", 30, "Rose syrup with chilled water and basil seeds."],
  ["Chicken Tikka", "Starters", "Non-Veg", 95, "Tandoor-grilled chicken with mint chutney."],
  ["Paneer Tikka", "Starters", "Veg", 80, "Char-grilled paneer with peppers and mint chutney."],
  ["Hara Bhara Kabab", "Starters", "Vegan", 60, "Spinach and peas patties with green chutney."],
  ["Seekh Kabab", "Starters", "Non-Veg", 100, "Minced lamb on skewers, Lucknowi style."],
  ["Butter Chicken", "Main Course", "Non-Veg", 130, "Murgh makhani in a rich tomato-cream gravy."],
  ["Paneer Butter Masala", "Main Course", "Veg", 95, "Paneer in a smooth tomato and butter gravy."],
  ["Dal Makhani", "Main Course", "Veg", 70, "Slow-cooked black lentils with cream and butter."],
  ["Hyderabadi Lamb Curry", "Main Course", "Non-Veg", 150, "Tender lamb in a bold Deccani masala."],
  ["Hyderabadi Dum Biryani", "Rice and Biryani", "Non-Veg", 170, "Slow-cooked mutton biryani, Hyderabadi style."],
  ["Veg Pulao", "Rice and Biryani", "Veg", 65, "Fragrant basmati with seasonal vegetables and whole spices."],
  ["Lucknowi Chicken Biryani", "Rice and Biryani", "Non-Veg", 155, "Awadhi dum biryani with saffron and kewra."],
  ["Butter Naan", "Breads", "Veg", 30, "Soft leavened bread baked in a tandoor, two pieces per guest."],
  ["Laccha Paratha", "Breads", "Veg", 28, "Flaky layered flatbread, two pieces per guest."],
  ["Raita and Achaar", "Side Dishes", "Veg", 20, "Boondi raita with mango or mixed pickle."],
  ["Papad and Salad", "Side Dishes", "Vegan", 15, "Roasted papad with a fresh kachumber salad."],
  ["Gulab Jamun", "Desserts", "Veg", 40, "Warm milk dumplings in cardamom syrup."],
  ["Gajar ka Halwa", "Desserts", "Veg", 50, "Slow-cooked carrot halwa with khoya and dry fruits."],
  ["Rasmalai", "Desserts", "Veg", 55, "Soft chenna discs in saffron-flavoured reduced milk."],
  ["Masala Chai", "Beverages", "Veg", 20, "Spiced milk tea served after the meal."],
];

const MENUS = [
  [
    "Grand Indian Wedding Feast",
    "Full non-veg spread for weddings and receptions across India.",
    [1, 3, 7, 11, 13, 14, 16, 18, 19, 21],
    300,
  ],
  [
    "Classic Veg Celebration",
    "Vegetarian package for engagements and family functions.",
    [2, 4, 5, 8, 9, 12, 15, 16, 18, 20],
    150,
  ],
  [
    "Corporate Lunch",
    "Compact lunch menu that suits office events.",
    [3, 8, 12, 14, 16, 18, 21],
    100,
  ],
  [
    "House Party Bites",
    "Starter-heavy menu for small gatherings at home.",
    [1, 3, 4, 5, 6, 14, 18],
    40,
  ],
];

// [customer, menu, event name, type, day offset, start, end, location, guests, service, status, extra, discount, advance share, dietary note]
const BOOKINGS = [
  [
    1,
    1,
    "Arjun and Riya Wedding",
    "Wedding",
    -45,
    "11:00",
    "16:00",
    "The Leela Palace, New Delhi",
    450,
    "Traditional",
    "Completed",
    20000,
    8000,
    1,
    "",
  ],
  [
    8,
    3,
    "TCS Kolkata Annual Dinner",
    "Corporate Event",
    -20,
    "19:00",
    "22:00",
    "ITC Royal Bengal, Kolkata",
    200,
    "Buffet",
    "Completed",
    0,
    0,
    1,
    "10 Jain meals",
  ],
  [
    4,
    4,
    "Sneha's Baby Shower",
    "House Party",
    -9,
    "16:00",
    "20:00",
    "GRT Grand, Chennai",
    60,
    "Buffet",
    "Completed",
    3000,
    0,
    1,
    "No nuts in any dish",
  ],
  [
    5,
    2,
    "Raza and Nida Nikah",
    "Wedding",
    -3,
    "10:00",
    "14:00",
    "The Oberoi, Bengaluru",
    250,
    "Plated",
    "Cancelled",
    0,
    0,
    0,
    "",
  ],
  [
    3,
    3,
    "Infosys Product Launch Lunch",
    "Corporate Event",
    0,
    "12:00",
    "15:00",
    "Hyderabad International Convention Centre",
    120,
    "Buffet",
    "In Progress",
    5000,
    0,
    0.5,
    "",
  ],
  [
    2,
    1,
    "Priya and Karan Reception",
    "Wedding",
    3,
    "19:00",
    "23:00",
    "Taj Mahal Palace, Mumbai",
    500,
    "Traditional",
    "Confirmed",
    30000,
    15000,
    0.4,
    "Halal section required",
  ],
  [
    7,
    4,
    "Kunal's Housewarming",
    "House Party",
    6,
    "18:00",
    "21:30",
    "Desai Residence, Ahmedabad",
    50,
    "Live Counters",
    "Confirmed",
    4000,
    0,
    0.3,
    "",
  ],
  [
    6,
    2,
    "Lakshmi and Ashok Engagement",
    "Engagement",
    10,
    "11:00",
    "14:00",
    "Jai Mahal Palace, Jaipur",
    200,
    "Plated",
    "Pending",
    6000,
    2000,
    0,
    "Pure veg, no onion or garlic for 25 guests",
  ],
  [
    9,
    4,
    "Vikram's 40th Birthday",
    "Birthday",
    16,
    "19:30",
    "23:00",
    "Conrad Pune",
    80,
    "Buffet",
    "Pending",
    0,
    2000,
    0,
    "",
  ],
  [
    10,
    1,
    "Meera and Dev Wedding",
    "Wedding",
    24,
    "10:00",
    "15:00",
    "Bolgatty Palace, Kochi",
    400,
    "Traditional",
    "Confirmed",
    22000,
    12000,
    0.25,
    "Separate veg counter",
  ],
];

export function buildSeed(now = new Date(), prefix = "") {
  const stamp = (daysAgo) => addDays(now, -daysAgo).toISOString();

  const customers = CUSTOMERS.map(([name, phone, email, address], i) => ({
    id: seedId(1, i + 1, prefix),
    name,
    phone,
    email,
    address,
    notes: "",
    isDemo: true,
    createdAt: stamp(90 - i),
    updatedAt: stamp(90 - i),
  }));

  const menuItems = ITEMS.map(
    ([name, category, dietaryType, pricePerPerson, description, available], i) => ({
      id: seedId(2, i + 1, prefix),
      name,
      category,
      description,
      pricePerPerson,
      dietaryType,
      imageUrl: "",
      isAvailable: available ?? true,
      isDemo: true,
      createdAt: stamp(100),
      updatedAt: stamp(100),
    }),
  );

  const menus = MENUS.map(([name, description, items, guests], i) => ({
    id: seedId(3, i + 1, prefix),
    name,
    description,
    itemIds: items.map((n) => seedId(2, n, prefix)),
    defaultGuestCount: guests,
    isDemo: true,
    createdAt: stamp(95 - i),
    updatedAt: stamp(95 - i),
  }));

  const bookings = BOOKINGS.map((row, i) => {
    const [
      c,
      m,
      eventName,
      eventType,
      offset,
      startTime,
      endTime,
      location,
      guestCount,
      serviceType,
      status,
      additionalCharges,
      discount,
      advanceShare,
      dietaryRequirements,
    ] = row;
    const menu = menus[m - 1];
    const pricePerPerson = menuPricePerPerson(menu, menuItems);
    const total = computePricing({
      guestCount,
      pricePerPerson,
      additionalCharges,
      discount,
      advanceAmount: 0,
    }).totalPrice;
    const advanceAmount = Math.round((total * advanceShare) / 100) * 100;
    const pricing = computePricing({
      guestCount,
      pricePerPerson,
      additionalCharges,
      discount,
      advanceAmount: Math.min(advanceAmount, total),
    });
    // Older events were booked earlier; keeps "recent activity" in a sensible order.
    const created = stamp(Math.max(1, 30 - offset / 2 - i));
    return {
      id: seedId(4, i + 1, prefix),
      customerId: seedId(1, c, prefix),
      eventName,
      eventType,
      eventDate: format(addDays(now, offset), "yyyy-MM-dd"),
      startTime,
      endTime,
      location,
      guestCount,
      menuId: menu.id,
      serviceType,
      dietaryRequirements,
      instructions: "",
      pricePerPerson,
      additionalCharges,
      discount,
      totalPrice: pricing.totalPrice,
      advanceAmount: Math.min(advanceAmount, total),
      remainingBalance: pricing.remainingBalance,
      paymentStatus: pricing.paymentStatus,
      status,
      isDemo: true,
      createdAt: created,
      updatedAt: created,
    };
  });

  return {
    customers,
    menuItems,
    menus,
    bookings,
    calculations: [],
    settings: defaultSettings(now, prefix),
  };
}
