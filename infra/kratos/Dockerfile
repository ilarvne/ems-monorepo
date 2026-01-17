FROM oryd/kratos:v1.3.0

# Copy configuration files
COPY kratos.prod.yml /etc/config/kratos/kratos.yml
COPY identity.schema.json /etc/config/kratos/identity.schema.json
COPY microsoft-claims-mapper.jsonnet /etc/config/kratos/microsoft-claims-mapper.jsonnet

# Expose ports
EXPOSE 4433 4434

# Default command - serve with config
ENTRYPOINT ["kratos"]
CMD ["serve", "-c", "/etc/config/kratos/kratos.yml", "--watch-courier"]
