import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 

function ImovelCarousel({ fotos }) {
    if (!fotos || fotos.length === 0) {
        return <p>Este imóvel ainda não possui fotos.</p>;
    }
    return (
        <Carousel>
            {fotos.map(foto => (
                <div key={foto.id}>
                    <img src={foto.link_foto} alt={foto.titulo || 'Foto do imóvel'} />
                    <p className="legend">{foto.titulo}</p>
                </div>
            ))}
        </Carousel>
    );
}
export default ImovelCarousel;