CREATE DATABASE dam;

CREATE TABLE roles
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles(name)
VALUES
('ADMIN'),
('USER');

CREATE TABLE users
(
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    role_id INT REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assets
(
    id UUID PRIMARY KEY,
    original_name VARCHAR(500),
    mime_type VARCHAR(255),
    file_size BIGINT,
    storage_key TEXT,
    thumbnail_key TEXT,
    status VARCHAR(50),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset_downloads
(
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    user_id UUID REFERENCES users(id),
    downloaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset_views
(
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    user_id UUID REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT NOW()
);

