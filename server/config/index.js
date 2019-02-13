module.exports = {
    PORT: process.env.PORT || 80,
    HOST: process.env.HOST || 'db',
    POSTGRES_PORT: process.env.POSTGRES_PORT || 5432,
    POSTGRES_USER: process.env.POSTGRES_USER || 'docker',
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'docker'
}