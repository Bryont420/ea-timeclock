from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from ...models import PasswordResetAttempt

class Command(BaseCommand):
    help = 'Test rate limiting for logins and password reset requests'

    def print_ban_info(self, ban, context=""):
        if ban and ban.is_banned:
            self.stdout.write(f"\n{context}:")
            self.stdout.write(f"Ban Level: {ban.ban_level}")
            self.stdout.write(f"Ban End: {ban.ban_end}")
            time_left = ban.ban_end - timezone.now()
            self.stdout.write(f"Time Left: {time_left}")
        else:
            self.stdout.write(f"\n{context}: No active ban")

    def print_current_state(self, ip, attempt_type):
        attempts = PasswordResetAttempt.objects.filter(
            ip_address=ip,
            attempt_type=attempt_type
        ).count()
        
        latest_ban = PasswordResetAttempt.objects.filter(
            ip_address=ip,
            attempt_type='ban'
        ).order_by('-attempt_time').first()
        
        self.stdout.write(f"\nTotal {attempt_type} attempts: {attempts}")
        if latest_ban:
            self.stdout.write(f"Latest ban level: {latest_ban.ban_level}")
            if latest_ban.is_banned:
                self.stdout.write(f"Ban active until: {latest_ban.ban_end}")
            else:
                self.stdout.write("No active ban")
        else:
            self.stdout.write("No bans recorded")

    def test_ip(self, ip, target_level, attempt_type):
        """Test progression through ban levels"""
        attempts_needed = {
            1: 10,  # 10 attempts in 1 minute for Level 1
            2: 20,  # 20 attempts in 1 hour for Level 2
            3: 30,  # 30 attempts in 1 day for Level 3
            4: 50,  # 50 attempts in 1 week for Level 4
        }

        current_level = 0
        while current_level < target_level:
            next_level = current_level + 1
            attempts = attempts_needed[next_level]
            
            self.stdout.write(f"\nAttempting to reach Level {next_level}...")
            for i in range(attempts):
                # Create the attempt
                PasswordResetAttempt.objects.create(
                    ip_address=ip,
                    attempt_type=attempt_type
                )
                # Check if we should be banned
                ban = PasswordResetAttempt.check_and_create_ban(ip)
                if ban and ban.is_banned and ban.ban_level > current_level:
                    self.stdout.write(f"Reached Level {ban.ban_level} ban after {i+1} attempts")
                    self.print_ban_info(ban, f"Level {ban.ban_level} Ban Info")
                    current_level = ban.ban_level
                    break
            
            if current_level < next_level:
                self.stdout.write(f"Failed to reach Level {next_level}")
                break

    def handle(self, *args, **options):
        base_time = timezone.now()
        
        # Test Login Rate Limiting
        self.stdout.write("\n=== Testing Login Rate Limiting ===")
        
        # Test IP 1 - Progress through levels 1-3 with reset
        test_ip1 = "203.0.113.1"
        self.stdout.write("\n=== Testing IP 1 (Login) ===")
        self.test_ip(test_ip1, 3, 'login')
        
        input("\nPress Enter to test Login Ban Reset for IP 1...")
        self.stdout.write("\nTesting Login Ban Reset...")
        # Move time forward past Level 3 ban grace period (1 week)
        future_time = base_time + timedelta(weeks=1, hours=1)
        with freeze_time(future_time):
            # Create a new login attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip1,
                attempt_type='login'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip1)
            self.print_ban_info(ban, "After Reset")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip1, 'login')
        
        # Test IP 2 - All the way to permanent ban
        test_ip2 = "203.0.113.2"
        input("\nPress Enter to test IP 2 (Login Permanent Ban)...")
        self.stdout.write("\n=== Testing IP 2 (Login Permanent Ban) ===")
        self.test_ip(test_ip2, 4, 'login')
        
        # Try to reset permanent ban (should not work)
        input("\nPress Enter to attempt reset of login permanent ban (IP 2)...")
        self.stdout.write("\nTesting Login Permanent Ban Reset (should not work)...")
        future_time = base_time + timedelta(days=30)
        with freeze_time(future_time):
            # Create a new login attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip2,
                attempt_type='login'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip2)
            self.print_ban_info(ban, "After Reset Attempt")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip2, 'login')

        # Test Password Reset Request Rate Limiting
        self.stdout.write("\n\n=== Testing Password Reset Request Rate Limiting ===")
        
        # Test IP 3 - Progress through levels 1-3 with reset
        test_ip3 = "203.0.113.3"
        self.stdout.write("\n=== Testing IP 3 (Password Reset) ===")
        self.test_ip(test_ip3, 3, 'password_reset')
        
        input("\nPress Enter to test Password Reset Ban Reset for IP 3...")
        self.stdout.write("\nTesting Password Reset Ban Reset...")
        # Move time forward past Level 3 ban grace period (1 week)
        future_time = base_time + timedelta(weeks=1, hours=1)
        with freeze_time(future_time):
            # Create a new password reset attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip3,
                attempt_type='password_reset'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip3)
            self.print_ban_info(ban, "After Reset")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip3, 'password_reset')
        
        # Test IP 4 - All the way to permanent ban
        test_ip4 = "203.0.113.4"
        input("\nPress Enter to test IP 4 (Password Reset Permanent Ban)...")
        self.stdout.write("\n=== Testing IP 4 (Password Reset Permanent Ban) ===")
        self.test_ip(test_ip4, 4, 'password_reset')
        
        # Try to reset permanent ban (should not work)
        input("\nPress Enter to attempt reset of password reset permanent ban (IP 4)...")
        self.stdout.write("\nTesting Password Reset Permanent Ban Reset (should not work)...")
        future_time = base_time + timedelta(days=30)
        with freeze_time(future_time):
            # Create a new password reset attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip4,
                attempt_type='password_reset'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip4)
            self.print_ban_info(ban, "After Reset Attempt")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip4, 'password_reset')

        self.stdout.write("\n=== Test Complete ===")
