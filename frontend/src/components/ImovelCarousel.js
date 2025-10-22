import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";

function ImovelCarousel({ fotos }) {
    if (!fotos || fotos.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', background: '#f0f0f0', borderRadius: '8px' }}>
                <p>Este imóvel ainda não possui fotos.</p>
            </div>
        );
    }
    return (
        <Carousel showThumbs={false} infiniteLoop useKeyboardArrows autoPlay>
            {fotos.map(foto => (
                <div key={foto.id} style={{ height: '400px', backgroundColor: '#000' }}>
                    <img 
                        src={foto.link_foto} 
                        alt={foto.titulo || 'Foto do imóvel'} 
                        style={{ height: '100%', objectFit: 'contain' }} 
                    />
                    <p className="legend">{foto.titulo}</p>
                </div>
            ))}
        </Carousel>
    );
}

export default ImovelCarousel;