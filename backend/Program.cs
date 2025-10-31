using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniPM.Api.Data;
using MiniPM.Api.Services;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------
// ✅ CORS (Allow Frontend & Production Deployments)
// ----------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "https://mini-project-manager-sage.vercel.app", // ✅ Deployed frontend on Vercel
                "https://mini-project-manager.vercel.app"       // ✅ Optional old/alternate domain
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ----------------------------
// ✅ Add Core Services
// ----------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // 🔧 Prevent circular reference errors in JSON serialization
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ----------------------------
// ✅ Database (SQLite)
// ----------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// ----------------------------
// ✅ JWT Authentication Setup
// ----------------------------
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtKey))
{
    throw new Exception("JWT Key is missing in configuration.");
}
if (string.IsNullOrEmpty(jwtIssuer))
{
    throw new Exception("JWT Issuer is missing in configuration.");
}
if (string.IsNullOrEmpty(jwtAudience))
{
    throw new Exception("JWT Audience is missing in configuration.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// ----------------------------
// ✅ Custom Services
// ----------------------------
builder.Services.AddScoped<AuthService>();

var app = builder.Build();

// ----------------------------
// ✅ Middleware Pipeline
// ----------------------------
app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // optional, disable if not using https locally

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
