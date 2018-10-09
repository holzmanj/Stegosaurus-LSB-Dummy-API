import unittest
import lsb

class LSBTests(unittest.TestCase):
	def test_byte_to_bits(self):
		self.assertEqual(
			lsb.byte_to_bits(b'\x0A'),
			[0, 0, 0, 0, 1, 0, 1, 0])

	def test_bits_to_byte(self):
		self.assertEqual(
			lsb.bits_to_byte([0, 0, 0, 0, 1, 0, 1, 0]),
			b'\x0A')
