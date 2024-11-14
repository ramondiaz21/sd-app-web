require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

const { CLIENT_ID, CLIENT_SECRET } = process.env;

app.get('/top-products', async (req, res) => {
    const skus = req.query.sku ? req.query.sku.split(',').map(sku => sku.trim()) : [];
    const titles = req.query.title ? req.query.title.split(',').map(title => title.trim()) : [];

    try {
        // Obtener el token de acceso
        const tokenResponse = await axios.post('https://api.mercadolibre.com/oauth/token', {
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        });
        const accessToken = tokenResponse.data.access_token;

        // Función de búsqueda
        const searchProducts = async (query, isTitle) => {
            const searchResponse = await axios.get(`https://api.mercadolibre.com/sites/MLM/search?q=${query}&sort=best_selling&limit=10`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            return Promise.all(searchResponse.data.results.map(async (product) => {
                const sellerResponse = await axios.get(`https://api.mercadolibre.com/users/${product.seller.id}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                return {
                    query: query,
                    title: product.title,
                    price: product.price,
                    soldQuantity: product.sold_quantity,
                    thumbnail: product.thumbnail,
                    link: product.permalink,
                    sellerNickname: sellerResponse.data.nickname,
                    searchType: isTitle ? 'title' : 'sku'
                };
            }));
        };

        // Ejecutar la búsqueda para cada SKU o título
        const productPromises = [
            ...skus.map(sku => searchProducts(sku, false)),
            ...titles.map(title => searchProducts(title, true))
        ];

        // Esperar todas las búsquedas
        const allProducts = await Promise.all(productPromises);

        // Devolver todos los productos encontrados
        res.json(allProducts.flat());
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los datos');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
