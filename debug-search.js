const rawData = {
    "id": "JQs6bedw",
    "title": "Rebel Saab (From \"The Rajasaab\") - Telugu",
    "image": "https://c.saavncdn.com/126/Rebel-Saab-From-The-Rajasaab-Telugu-Telugu-2025-20251123211004-150x150.jpg",
    "more_info": {
        "music": "Thaman S",
        "album_id": "70034112",
        "album": "Rebel Saab (From \"The Rajasaab\") - Telugu",
        "artistMap": {
            "primary_artists": [
                { "name": "Ramajogayya Sastry" },
                { "name": "Thaman S" }
            ],
            "featured_artists": [],
            "artists": []
        },
        "encrypted_media_url": "ID2ieOjCrwfg..."
    }
};

function parse(item) {
    try {
        return {
            id: item.id,
            name: item.title,
            primaryArtists: item.more_info?.artistMap?.primary_artists?.map((a) => a.name).join(', ') || item.subtitle || '',
            image: [
                { quality: '500x500', link: item.image.replace('150x150', '500x500') },
                { quality: '150x150', link: item.image }
            ]
        };
    } catch (e) {
        return { error: e.message };
    }
}

console.log(parse(rawData));
