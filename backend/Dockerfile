# Use the official .NET 8 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy everything and restore dependencies
COPY . .
RUN dotnet restore

# Build and publish release
RUN dotnet publish -c Release -o out

# Use the ASP.NET runtime image for final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Copy published output
COPY --from=build /app/out .

# Expose the Render port
ENV ASPNETCORE_URLS=http://0.0.0.0:$PORT
EXPOSE 10000

# Start the app
ENTRYPOINT ["dotnet", "MiniPM.Api.dll"]
