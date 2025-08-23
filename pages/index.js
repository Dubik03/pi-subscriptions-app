// pages/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Marketplace() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, description");
      if (!error) setServices(data);
      else console.error("Error fetching services:", error);
    };
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">
          Pi Subscriptions - Marketplace
        </h1>
        {services.map((service) => (
          <div
            key={service.id}
            className="border p-5 mb-5 rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow"
          >
            <h2 className="font-semibold text-xl mb-2 text-blue-700">{service.name}</h2>
            <p className="text-gray-700 mb-2">{service.price} Pi / měsíc</p>
            <p className="whitespace-pre-line mb-4 text-gray-600">{service.description}</p>
            <Link href={`/service/${service.id}`}>
              <button className="px-5 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform">
                Subscribe
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
