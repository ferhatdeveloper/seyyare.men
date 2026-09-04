import { router } from "expo-router";
import { Heart, MapPin, Eye } from "lucide-react-native";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

import { api } from "../lib/api";
import { storage } from "../lib/clients";

export interface VehicleListItem {
  id: string;
  title?: string | null;
  make_name?: string | null;
  model?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel_name?: string | null;
  transmission_name?: string | null;
  body_name?: string | null;
  color_name?: string | null;
  price_amount?: number | string | null;
  price_currency?: string | null;
  country_code?: string | null;
  city?: string | null;
  cover_url?: string | null;
  created_at?: string | null;
}

interface Props {
  vehicle: VehicleListItem;
  onFavoriteChange?: (id: string, isFavorite: boolean) => void;
  initialFavorite?: boolean;
}

export function VehicleCard({ vehicle, onFavoriteChange, initialFavorite = false }: Props) {
  const [favorite, setFavorite] = useState(initialFavorite);

  const toggleFavorite = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    onFavoriteChange?.(vehicle.id, next);

    try {
      if (next) {
        await api.post("/favorites", { vehicle_id: vehicle.id });
      } else {
        await api.delete(`/favorites?vehicle_id=eq.${vehicle.id}`);
      }
    } catch {
      setFavorite(!next); // rollback
    }
  };

  const price = vehicle.price_amount
    ? Number(vehicle.price_amount).toLocaleString()
    : "—";
  const currency = vehicle.price_currency ?? "";

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm border border-slate-100"
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
      activeOpacity={0.9}
    >
      {/* Image */}
      <View className="relative">
        {vehicle.cover_url ? (
          <Image
            source={{ uri: vehicle.cover_url.startsWith("http") ? vehicle.cover_url : `${storage.url}/${vehicle.cover_url}` }}
            style={{ width: "100%", height: 180 }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View className="w-full h-[180px] bg-slate-200 items-center justify-center">
            <Text className="text-slate-400 text-sm">Fotoğraf yok</Text>
          </View>
        )}

        <TouchableOpacity
          className="absolute top-3 right-3 bg-white/95 rounded-full w-10 h-10 items-center justify-center"
          onPress={toggleFavorite}
          hitSlop={8}
        >
          <Heart
            size={18}
            color={favorite ? "#EF4444" : "#64748B"}
            fill={favorite ? "#EF4444" : "transparent"}
          />
        </TouchableOpacity>

        {vehicle.year && (
          <View className="absolute bottom-3 left-3 bg-black/70 rounded-lg px-2.5 py-1">
            <Text className="text-white text-xs font-bold">{vehicle.year}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-4">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {(() => {
            const makeModel = ((vehicle.make_name ?? "") + " " + (vehicle.model ?? "")).trim();
            return vehicle.title ?? (makeModel || "Araç");
          })()}
        </Text>

        <View className="flex-row flex-wrap mt-1.5">
          {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && (
            <Text className="text-xs text-slate-500 mr-3">
              {vehicle.mileage_km.toLocaleString()} km
            </Text>
          )}
          {vehicle.fuel_name && (
            <Text className="text-xs text-slate-500 mr-3">{vehicle.fuel_name}</Text>
          )}
          {vehicle.transmission_name && (
            <Text className="text-xs text-slate-500 mr-3">{vehicle.transmission_name}</Text>
          )}
        </View>

        <View className="flex-row items-center mt-2">
          <MapPin size={12} color="#64748B" />
          <Text className="text-xs text-slate-500 ml-1 flex-1" numberOfLines={1}>
            {[vehicle.city, vehicle.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <Text className="text-lg font-bold text-primary-600">
            {price} {currency}
          </Text>
          {vehicle.created_at && (
            <View className="flex-row items-center">
              <Eye size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-400 ml-1">
                {timeAgo(vehicle.created_at)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function timeAgo(date: string): string {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (seconds < 60) return "şimdi";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün`;
  return new Date(date).toLocaleDateString("tr-TR");
}