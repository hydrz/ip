#!/bin/bash

response=$(curl -s -D - https://ip.hydrz.cn -o /dev/null)
client_ip=$(echo "$response" | grep -i '^x-client-ip:' | awk '{print $2}' | tr -d '\r')
client_asn=$(echo "$response" | grep -i '^x-client-asn:' | awk '{print $2}' | tr -d '\r')
client_geo=$(echo "$response" | grep -i '^x-client-geo:' | awk '{print $2}' | tr -d '\r')
edge_ip=$(echo "$response" | grep -i '^x-edge-ip:' | awk '{print $2}' | tr -d '\r')
cf_ray=$(echo "$response" | grep -i '^cf-ray:' | awk '{print $2}' | tr -d '\r')

continent=$(echo "$client_geo" | cut -d',' -f1)
country=$(echo "$client_geo" | cut -d',' -f2)
region=$(echo "$client_geo" | cut -d',' -f3)
city=$(echo "$client_geo" | cut -d',' -f4)
longitude=$(echo "$client_geo" | cut -d',' -f5)
latitude=$(echo "$client_geo" | cut -d',' -f6)
postal_code=$(echo "$client_geo" | cut -d',' -f7)
region_code=$(echo "$client_geo" | cut -d',' -f8)

echo "Client IP: $client_ip"
echo "Client ASN: $client_asn"
echo "Client Geo:"
echo "  Continent: $continent"
echo "  Country: $country"
echo "  Region: $region"
echo "  City: $city"
echo "  Longitude: $longitude"
echo "  Latitude: $latitude"
echo "  Postal Code: $postal_code"
echo "  Region Code: $region_code"
echo "CF IP: $edge_ip"
echo "CF Ray: $cf_ray"