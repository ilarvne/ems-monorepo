FROM alpine:3.19 AS builder

# Create a simple launcher script 
RUN echo '#!/bin/sh' > /launcher.sh && \
    echo 'exec /spicedb serve \' >> /launcher.sh && \
    echo '  --grpc-preshared-key="$SPICEDB_GRPC_PRESHARED_KEY" \' >> /launcher.sh && \
    echo '  --datastore-engine=postgres \' >> /launcher.sh && \
    echo '  --datastore-conn-uri="$SPICEDB_DATASTORE_CONN_URI" \' >> /launcher.sh && \
    echo '  --grpc-addr=:50051 \' >> /launcher.sh && \
    echo '  --dispatch-cluster-enabled=false' >> /launcher.sh && \
    chmod +x /launcher.sh

FROM authzed/spicedb:v1.35.3

# Copy the spicedb binary to a known location that we can reference
COPY --from=builder /launcher.sh /launcher.sh

# Actually the above won't work since distroless has no shell
# Let me try a different approach

FROM gcr.io/distroless/base-debian12

# Copy spicedb binary from official image
COPY --from=authzed/spicedb:v1.35.3 /spicedb /spicedb

# SpiceDB is the entrypoint, serve with args will come from Azure Container Apps
ENTRYPOINT ["/spicedb"]
CMD ["serve", "--grpc-addr=:50051", "--dispatch-cluster-enabled=false"]
