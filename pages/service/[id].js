// pi_subscriptions_app/pages/service/[id].js
import { useRouter } from 'next/router';
import Link from 'next/link';


const services = [
{ id: 1, name: 'Fitness Klub Praha', price: 2, description: '✔️ Přístup do posilovny\n✔️ Online rezervace\n✔️ Členství ve skupině' },
{ id: 2, name: 'Online English Tutor', price: 1.5, description: '✔️ Online lekce\n✔️ Přístup k materiálům\n✔️ Individuální feedback' },
{ id: 3, name: 'Crypto News Portal', price: 0.5, description: '✔️ Přístup k exkluzivnímu obsahu\n✔️ Týdenní analýzy\n✔️ Premium newsletter' },
];


export default function ServiceDetail() {
const router = useRouter();
const { id } = router.query;
const service = services.find(s => s.id === parseInt(id));


if (!service) return <p className="text-center mt-10 text-red-500">Service not found</p>;


const handleSubscribe = () => {
alert(`Simulated Pi Wallet: Subscribed to ${service.name} for ${service.price} Pi/month`);
};


return (
<div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
<div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
<h1 className="text-3xl font-bold mb-4 text-blue-700">{service.name}</h1>
<p className="text-gray-700 mb-2">{service.price} Pi / měsíc</p>
<p className="whitespace-pre-line mb-6 text-gray-600">{service.description}</p>
<button onClick={handleSubscribe} className="px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3">Subscribe Now</button>
<Link href="/subscriptions">
<button className="px-6 py-2 bg-gray-300 rounded-xl shadow hover:scale-105 transform transition-transform">My Subscriptions</button>
</Link>
</div>
</div>
);
}
