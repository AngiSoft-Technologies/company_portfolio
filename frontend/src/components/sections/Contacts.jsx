import React, { useEffect, useState } from 'react';
import ContactCard from "../cards/ContactCard";
import { apiGet } from '../../js/httpClient';

const Contacts = ({ theme }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const data = await apiGet('/contacts');
                setContacts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setVisible(true), 100);
            }
        };
        fetchContacts();
    }, []);

    return (
        <section id="contact-me" className={`p-6 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}> 
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-gradient bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent animate-fade-in text-center">Contact Us</h2>
            <div className="contacts grid grid-cols-3 gap-6">
                <div className="contact-cards space-y-4">
                    {loading && <p>Loading...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!loading && !error && (
                        contacts.length > 0 ? contacts.map((contact, idx) => (
                            <ContactCard
                                key={contact._id || idx}
                                icon={contact.iconLink || 'fa fa-address-card'}
                                title={contact.label}
                                subtitle={contact.contact}
                                link={contact.contactLink || '#'}
                                theme={theme}
                            />
                        )) : <p>No contact information available at the moment.</p>
                    )}
                </div>
                <div className="contact-form col-span-2">
                    <p className={`mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-lg animate-fade-in-slow`}>
                        Ready to start your next project? Get in touch with us today. We're here to help bring your ideas to life.
                    </p>
                    <div className="mt-6">
                        <a 
                            href="/book" 
                            className={`inline-block px-6 py-3 rounded-lg font-semibold transition-all ${
                                theme === 'dark' 
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                        >
                            Request a Quote
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contacts;