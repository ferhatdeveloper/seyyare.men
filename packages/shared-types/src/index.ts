import { z } from "zod";

// ====== Auth ======
export const RegisterSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
  password: z.string().min(8).max(128),
  locale: z.string().default("tr"),
  displayName: z.string().min(2).max(64).optional(),
  role: z.enum(["user", "dealer"]).default("user"),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// ====== Vehicles ======
export const VehicleCondition = z.enum(["new", "like_new", "used", "damaged", "salvage"]);
export const VehicleStatus = z.enum([
  "draft",
  "active",
  "reserved",
  "sold",
  "expired",
  "removed",
]);

export const CreateVehicleSchema = z.object({
  makeId: z.number().int().positive(),
  makeCustom: z.string().max(64).optional(),
  model: z.string().max(64),
  trim: z.string().max(64).optional(),
  year: z.number().int().min(1900).max(2100),
  mileageKm: z.number().int().min(0),
  fuelTypeId: z.number().int().positive(),
  transmissionId: z.number().int().positive(),
  bodyTypeId: z.number().int().positive(),
  colorId: z.number().int().positive(),
  condition: VehicleCondition,
  priceAmount: z.number().int().positive(),
  priceCurrency: z.string().length(3).default("USD"),
  negotiable: z.boolean().default(true),
  countryCode: z.string().length(2),
  city: z.string().max(64).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  titleOriginal: z.string().min(3).max(200),
  descriptionOriginal: z.string().min(10).max(5000),
  features: z.array(z.number().int()).default([]),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;

// ====== Rentals ======
export const RentalStatus = z.enum(["active", "paused", "closed"]);
export const BookingStatus = z.enum([
  "pending",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "rejected",
]);

export const CreateRentalSchema = z.object({
  vehicleId: z.string().uuid(),
  dailyRateAmount: z.number().int().positive(),
  dailyRateCurrency: z.string().length(3).default("USD"),
  weeklyRateAmount: z.number().int().positive().optional(),
  monthlyRateAmount: z.number().int().positive().optional(),
  depositAmount: z.number().int().positive().optional(),
  minDays: z.number().int().min(1).default(1),
  maxDays: z.number().int().min(1).default(30),
  insuranceIncluded: z.boolean().default(false),
  deliveryAvailable: z.boolean().default(false),
  instantBook: z.boolean().default(false),
  ageRequirement: z.number().int().min(18).default(21),
});

export const CreateBookingSchema = z.object({
  rentalId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateRentalInput = z.infer<typeof CreateRentalSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// ====== Search ======
export const SearchVehiclesSchema = z.object({
  q: z.string().optional(),
  makeIds: z.array(z.number().int()).optional(),
  bodyTypeIds: z.array(z.number().int()).optional(),
  fuelTypeIds: z.array(z.number().int()).optional(),
  transmissionIds: z.array(z.number().int()).optional(),
  colorIds: z.array(z.number().int()).optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().optional(),
  minYear: z.number().int().optional(),
  maxYear: z.number().int().optional(),
  minPrice: z.number().int().optional(),
  maxPrice: z.number().int().optional(),
  minMileage: z.number().int().optional(),
  maxMileage: z.number().int().optional(),
  condition: VehicleCondition.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().int().optional(),
  locale: z.string().default("tr"),
  sortBy: z.enum(["created_at", "price", "year", "mileage", "distance"]).default("created_at"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  pageSize: z.number().int().min(1).max(100).default(20),
  pageOffset: z.number().int().min(0).default(0),
});

export type SearchVehiclesInput = z.infer<typeof SearchVehiclesSchema>;

// ====== Messages ======
export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "file"]).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;