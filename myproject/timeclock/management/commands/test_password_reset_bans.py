from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from ...models import PasswordResetAttempt

class Command(BaseCommand):
    help = 'Test password reset rate limiting and bans'

    def print_ban_info(self, ban, context=""):
        if ban and ban.is_banned:
            self.stdout.write(f"\n{context}:")
            self.stdout.write(f"Ban Level: {ban.ban_level}")
            self.stdout.write(f"Ban End: {ban.ban_end}")
            time_left = ban.ban_end - timezone.now()
            self.stdout.write(f"Time Left: {time_left}")
        else:
            self.stdout.write(f"\n{context}: No active ban")

    def print_current_state(self, ip):
        attempts = PasswordResetAttempt.objects.filter(
            ip_address=ip,
            attempt_type='password_reset'
        ).count()
        
        latest_ban = PasswordResetAttempt.objects.filter(
            ip_address=ip,
            attempt_type='ban'
        ).order_by('-attempt_time').first()
        
        self.stdout.write(f"\nTotal password reset attempts: {attempts}")
        if latest_ban:
            self.stdout.write(f"Latest ban level: {latest_ban.ban_level}")
            if latest_ban.is_banned:
                self.stdout.write(f"Ban active until: {latest_ban.ban_end}")
            else:
                self.stdout.write("No active ban")
        else:
            self.stdout.write("No bans recorded")

    def test_ip(self, ip, target_level):
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
                    attempt_type='password_reset'
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
        
        # Test IP 1 - Progress through levels 1-3 with reset
        test_ip1 = "203.0.113.1"
        self.stdout.write("\n=== Testing IP 1 (Password Reset) ===")
        self.test_ip(test_ip1, 3)
        
        input("\nPress Enter to test Password Reset Ban Reset for IP 1...")
        self.stdout.write("\nTesting Password Reset Ban Reset...")
        # Move time forward past Level 3 ban grace period (1 week)
        future_time = base_time + timedelta(weeks=1, hours=1)
        with freeze_time(future_time):
            # Create a new password reset attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip1,
                attempt_type='password_reset'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip1)
            self.print_ban_info(ban, "After Reset")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip1)
        
        # Test IP 2 - All the way to permanent ban
        test_ip2 = "203.0.113.2"
        input("\nPress Enter to test IP 2 (Password Reset Permanent Ban)...")
        self.stdout.write("\n=== Testing IP 2 (Password Reset Permanent Ban) ===")
        self.test_ip(test_ip2, 4)
        
        # Try to reset permanent ban (should not work)
        input("\nPress Enter to attempt reset of password reset permanent ban (IP 2)...")
        self.stdout.write("\nTesting Password Reset Permanent Ban Reset (should not work)...")
        future_time = base_time + timedelta(days=30)
        with freeze_time(future_time):
            # Create a new password reset attempt
            PasswordResetAttempt.objects.create(
                ip_address=test_ip2,
                attempt_type='password_reset'
            )
            ban = PasswordResetAttempt.check_and_create_ban(test_ip2)
            self.print_ban_info(ban, "After Reset Attempt")
            self.stdout.write("\nState at simulated time:")
            self.stdout.write(f"Time: {timezone.now()}")
            self.print_current_state(test_ip2)

        self.stdout.write("\n=== Test Complete ===")
